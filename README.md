![Banner](banner.svg)

# clone-any-app

> Give it a URL. Get a working clone.

[![npm version](https://img.shields.io/npm/v/clone-any-app?color=4ADE80&label=npm)](https://www.npmjs.com/package/clone-any-app)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/NickCirv/clone-any-app?style=flat)](https://github.com/NickCirv/clone-any-app/stargazers)

## The Problem

You see a beautiful landing page. You want something like it. Normally: open DevTools, inspect element, copy CSS snippet by snippet, rebuild from scratch, realise the font is wrong, give up. What if you could just... clone it? Point, shoot, done.

## Quick Start

```bash
export ANTHROPIC_API_KEY=sk-ant-...

npx clone-any-app https://stripe.com/pricing
```

Output lands in `./stripe-clone/` — open `index.html` and you're looking at the clone.

```bash
# Specify output directory
npx clone-any-app https://linear.app --output ./my-clone

# Use a specific model
npx clone-any-app https://vercel.com --model claude-opus-4-5
```

## Example Output

```
$ npx clone-any-app https://stripe.com/pricing

  Fetching https://stripe.com/pricing...
  Analysing visual structure...
  Generating clone with claude-opus-4-5...

  stripe-clone/
  ├── index.html    ✓  Clean semantic HTML
  ├── styles.css    ✓  Matching visual styles
  └── script.js     ✓  Interactivity preserved

  Done in 8.3s. Open stripe-clone/index.html to view.
```

Open `index.html` in your browser — it looks like the original.

## Features

- **One command** — URL in, working clone out
- **AI-powered analysis** — understands layout, colour, spacing, typography
- **Clean output** — semantic HTML, readable CSS, no minified soup
- **Editable** — clone is yours to modify, extend, or learn from
- **Model choice** — pick your Anthropic model via `--model`

## How It Works

1. Fetches the target URL's HTML and CSS
2. AI analyses the visual structure and design system
3. Generates clean, modern code that recreates the look
4. Writes files you can edit, deploy, or study

## Options

```
clone-any-app <url> [options]

Options:
  -o, --output <dir>    Output directory (default: <hostname>-clone)
  -m, --model <model>   Anthropic model (default: claude-opus-4-5)
  -V, --version         Show version
  -h, --help            Show help
```

## Requirements

- Node.js 18+
- `ANTHROPIC_API_KEY` environment variable

Works best on marketing and landing pages. Complex SPAs may produce partial results — think of those as a starting point, not a finished clone.

## See Also

- [one-prompt-saas](https://github.com/NickCirv/one-prompt-saas) — Full SaaS from one prompt
- [zero-to-prod](https://github.com/NickCirv/zero-to-prod) — Empty dir to deployed app speedrun
- [readme-surgeon](https://github.com/NickCirv/readme-surgeon) — Upgrade any README with AI

## License

MIT — [NickCirv](https://github.com/NickCirv)
