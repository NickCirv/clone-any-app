/**
 * Lightweight HTML/CSS scraper — no headless browser required.
 * Fetches raw HTML, pulls linked CSS, extracts structure.
 * The AI does the heavy lifting of understanding the layout.
 */

const FETCH_TIMEOUT_MS = 15000

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    return res
  } finally {
    clearTimeout(timer)
  }
}

function extractCssLinks(html, baseUrl) {
  const links = []
  const linkRe = /<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi
  const hrefRe = /<link[^>]+href=["']([^"']+)["'][^>]*rel=["']stylesheet["']/gi
  let match

  while ((match = linkRe.exec(html)) !== null) {
    links.push(match[1])
  }
  while ((match = hrefRe.exec(html)) !== null) {
    links.push(match[1])
  }

  return [...new Set(links)].map(href => {
    if (href.startsWith('http://') || href.startsWith('https://')) return href
    if (href.startsWith('//')) return `https:${href}`
    const base = new URL(baseUrl)
    if (href.startsWith('/')) return `${base.origin}${href}`
    return new URL(href, baseUrl).href
  })
}

function extractImageUrls(html, baseUrl) {
  const images = []
  const imgRe = /<img[^>]+src=["']([^"']+)["']/gi
  let match

  while ((match = imgRe.exec(html)) !== null) {
    const src = match[1]
    if (src.startsWith('data:')) continue
    try {
      const abs = src.startsWith('http') ? src
        : src.startsWith('//') ? `https:${src}`
        : src.startsWith('/') ? `${new URL(baseUrl).origin}${src}`
        : new URL(src, baseUrl).href
      images.push(abs)
    } catch {
      // skip malformed URLs
    }
  }

  return [...new Set(images)].slice(0, 20)
}

function extractMeta(html) {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const title = titleMatch ? titleMatch[1].trim() : 'Untitled'

  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)
  const description = descMatch ? descMatch[1].trim() : ''

  return { title, description }
}

function trimHtml(html) {
  // Remove script tags, noscript, comments — keep structure
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 80000)
}

export async function scrape(url) {
  let htmlRes
  try {
    htmlRes = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; clone-any-app/1.0)',
        'Accept': 'text/html,application/xhtml+xml,*/*',
      }
    })
  } catch (err) {
    throw new Error(`Failed to fetch ${url}: ${err.message}`)
  }

  if (!htmlRes.ok) {
    throw new Error(`HTTP ${htmlRes.status} from ${url}`)
  }

  const rawHtml = await htmlRes.text()
  const { title, description } = extractMeta(rawHtml)
  const html = trimHtml(rawHtml)

  // Extract inline styles
  const inlineStyles = []
  const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi
  let styleMatch
  while ((styleMatch = styleRe.exec(rawHtml)) !== null) {
    inlineStyles.push(styleMatch[1].trim())
  }

  // Fetch linked CSS (up to 3 sheets to stay fast)
  const cssLinks = extractCssLinks(rawHtml, url).slice(0, 3)
  const externalCss = []

  await Promise.allSettled(
    cssLinks.map(async cssUrl => {
      try {
        const res = await fetchWithTimeout(cssUrl)
        if (res.ok) {
          const text = await res.text()
          externalCss.push(text.slice(0, 30000))
        }
      } catch {
        // non-fatal — continue without this sheet
      }
    })
  )

  const css = [...inlineStyles, ...externalCss].join('\n\n').slice(0, 60000)
  const images = extractImageUrls(rawHtml, url)

  return { html, css, title, description, images, sourceUrl: url }
}
