/**
 * clone-any-app
 * Give it a URL. Get a working clone.
 *
 * Usage:
 *   clone-any-app <url> [--output <dir>] [--model <model>]
 */

import { program } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { resolve, basename } from 'path'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

import { scrape } from './scraper.js'
import { buildClonePrompt, SYSTEM_PROMPT } from './prompts.js'
import { writeClone, parseAiResponse } from './writer.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'))

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-opus-4-5'
const FETCH_TIMEOUT_MS = 120000

function requireApiKey() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key || !key.startsWith('sk-')) {
    console.error(chalk.red('\nMissing ANTHROPIC_API_KEY environment variable.'))
    console.error(chalk.dim('  export ANTHROPIC_API_KEY=sk-ant-...'))
    process.exit(1)
  }
  return key
}

function normalizeUrl(raw) {
  if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
    return `https://${raw}`
  }
  return raw
}

function defaultOutputDir(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    return resolve(`${hostname}-clone`)
  } catch {
    return resolve('clone-output')
  }
}

async function callAnthropic(apiKey, model, prompt) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let res
  try {
    res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Anthropic API error ${res.status}: ${body}`)
  }

  const data = await res.json()
  const block = data.content?.find(b => b.type === 'text')
  if (!block) throw new Error('No text content in Anthropic response')
  return block.text
}

export async function run() {
  program
    .name('clone-any-app')
    .description('Give it a URL. Get a working clone.')
    .version(pkg.version)
    .argument('<url>', 'URL of the site to clone')
    .option('-o, --output <dir>', 'output directory (default: <hostname>-clone)')
    .option('-m, --model <model>', 'Anthropic model to use', DEFAULT_MODEL)
    .parse()

  const [rawUrl] = program.args
  const opts = program.opts()
  const url = normalizeUrl(rawUrl)
  const outputDir = opts.output ? resolve(opts.output) : defaultOutputDir(url)
  const model = opts.model

  console.log()
  console.log(chalk.bold.cyan('  clone-any-app') + chalk.dim(` v${pkg.version}`))
  console.log(chalk.dim('  ─────────────────────────────────'))
  console.log(`  ${chalk.dim('Target:')}  ${chalk.white(url)}`)
  console.log(`  ${chalk.dim('Output:')}  ${chalk.white(outputDir)}`)
  console.log(`  ${chalk.dim('Model:')}   ${chalk.white(model)}`)
  console.log()

  const apiKey = requireApiKey()

  // Step 1: Scrape
  const scrapeSpinner = ora({
    text: 'Fetching HTML and CSS...',
    color: 'cyan',
  }).start()

  let scraped
  try {
    scraped = await scrape(url)
    scrapeSpinner.succeed(
      chalk.green('Scraped') +
      chalk.dim(` — ${scraped.title} · ${(scraped.html.length / 1024).toFixed(1)}KB HTML · ${(scraped.css.length / 1024).toFixed(1)}KB CSS · ${scraped.images.length} images`)
    )
  } catch (err) {
    scrapeSpinner.fail(chalk.red(`Scrape failed: ${err.message}`))
    process.exit(1)
  }

  // Step 2: Build prompt
  const prompt = buildClonePrompt(scraped)

  // Step 3: Call AI
  const aiSpinner = ora({
    text: `Generating clone with ${model}...`,
    color: 'magenta',
  }).start()

  let rawResponse
  try {
    rawResponse = await callAnthropic(apiKey, model, prompt)
    aiSpinner.succeed(chalk.green('AI clone generated') + chalk.dim(` — ${(rawResponse.length / 1024).toFixed(1)}KB response`))
  } catch (err) {
    aiSpinner.fail(chalk.red(`AI generation failed: ${err.message}`))
    process.exit(1)
  }

  // Step 4: Parse + write
  const writeSpinner = ora({
    text: 'Writing files...',
    color: 'yellow',
  }).start()

  let files
  try {
    files = parseAiResponse(rawResponse)
  } catch (err) {
    writeSpinner.fail(chalk.red(`Failed to parse AI response: ${err.message}`))
    process.exit(1)
  }

  let written
  try {
    written = await writeClone(outputDir, files)
    writeSpinner.succeed(chalk.green(`Wrote ${written.length} files`) + chalk.dim(` to ${outputDir}`))
  } catch (err) {
    writeSpinner.fail(chalk.red(`Write failed: ${err.message}`))
    process.exit(1)
  }

  // Step 5: Summary
  console.log()
  console.log(chalk.bold.green('  Clone complete!'))
  console.log()

  for (const f of written) {
    console.log(`  ${chalk.green('✓')} ${chalk.white(f)}`)
  }

  console.log()
  console.log(`  ${chalk.bold('Preview:')}`)
  console.log(`  ${chalk.cyan(`open ${outputDir}/index.html`)}`)
  console.log(`  ${chalk.dim('or')} ${chalk.cyan(`npx serve ${outputDir}`)}`)
  console.log()
}
