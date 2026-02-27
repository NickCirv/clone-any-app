/**
 * Prompts for the AI clone generation step.
 */

export function buildClonePrompt({ html, css, title, description, images, sourceUrl }) {
  const imageList = images.length > 0
    ? `\nOriginal image URLs found (use placehold.co instead):\n${images.slice(0, 10).join('\n')}`
    : ''

  return `You are an expert frontend developer who recreates websites from their HTML/CSS source.

Target site: ${sourceUrl}
Title: ${title}
${description ? `Description: ${description}` : ''}
${imageList}

---

HTML SOURCE:
${html}

---

CSS SOURCE:
${css || '(no external CSS found — reconstruct styles from the HTML)'}

---

Create a clean, fully working clone of this website with these 3 files:

1. **index.html** — Semantic HTML matching the visual structure and layout
2. **styles.css** — Clean, modern CSS recreating the look (use flexbox/grid, CSS custom properties)
3. **script.js** — Any interactivity (nav toggles, dropdowns, modals, tabs, accordions)

Rules:
- Replace all images with https://placehold.co/ equivalents (match dimensions and purpose)
- Use system font stack instead of any custom/loaded fonts: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
- Keep the color scheme accurate — extract real colors from the CSS/HTML
- Make it responsive (mobile-first, use media queries)
- Write clean, readable code — not minified
- Include all visible text content
- Do not reference any external resources that might be blocked (CDNs, fonts, etc.)
- script.js can be empty if there's no meaningful interactivity

IMPORTANT: Respond with ONLY valid JSON in this exact shape — no markdown, no explanation, just the JSON:

{
  "index.html": "<full HTML file content here>",
  "styles.css": "/* full CSS file content here */",
  "script.js": "// full JS file content here"
}
`
}

export const SYSTEM_PROMPT = `You are a frontend developer who specializes in recreating website UIs from HTML/CSS source code. You always respond with clean, valid JSON containing the three output files. You never include markdown code fences or explanation — only the raw JSON object.`
