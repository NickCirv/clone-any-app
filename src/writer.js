/**
 * Writes the AI-generated clone files to disk.
 * Creates the output directory if it doesn't exist.
 */

import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'

const FILE_KEYS = ['index.html', 'styles.css', 'script.js']

export async function writeClone(outputDir, files) {
  await mkdir(outputDir, { recursive: true })

  const written = []

  for (const key of FILE_KEYS) {
    const content = files[key]
    if (content === undefined || content === null) {
      throw new Error(`AI response missing required file: ${key}`)
    }
    const filePath = join(outputDir, key)
    await writeFile(filePath, String(content), 'utf8')
    written.push(filePath)
  }

  return written
}

export function parseAiResponse(rawText) {
  // Strip markdown code fences if the model added them anyway
  let cleaned = rawText.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/, '').replace(/```$/, '').trim()
  }

  try {
    return JSON.parse(cleaned)
  } catch {
    // Try to extract JSON object from surrounding text
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) {
      return JSON.parse(match[0])
    }
    throw new Error('AI response was not valid JSON. Try running again.')
  }
}
