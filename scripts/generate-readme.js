#!/usr/bin/env node
/**
 * scripts/generate-readme.js
 * Auto-generates README.md from package.json + static template.
 * Run: node scripts/generate-readme.js
 * Or automatically after build: npm run build
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = resolve(__dirname, '..')

// Read package.json
const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'))

// Build date
const now    = new Date()
const built  = now.toISOString().split('T')[0]
const year   = now.getFullYear()

const readme = `# ${pkg.name} v${pkg.version}

> ${pkg.description}

![Version](https://img.shields.io/badge/version-${pkg.version}-7c3aed?style=flat-square)
![Vite](https://img.shields.io/badge/vite-6-646cff?style=flat-square&logo=vite)
![Tailwind](https://img.shields.io/badge/tailwind-4-06b6d4?style=flat-square&logo=tailwindcss)
![License](https://img.shields.io/badge/license-MIT-10b981?style=flat-square)

---

## ✨ Features

- **Text / URL QR** — paste any link or plain text
- **File Upload QR** — upload images, PDFs, videos (up to 200 MB)
  - Files hosted via [catbox.moe](https://catbox.moe) → [tmpfiles.org](https://tmpfiles.org) → [gofile.io](https://gofile.io) fallback chain
  - Zero disk storage — nothing saved on your machine
- **3 module styles** — Square, Rounded, Dots
- **Center logo** — default logo or your own image (22% size, ECC-H)
- **Custom colours** — QR foreground + background colour pickers
- **Adjustable size** — 200 px to 800 px
- **Error correction** — L / M / Q / H levels
- **History** — last 12 QRs saved in localStorage (clear all / delete individual)
- **Save / Copy / Share** — download PNG, copy to clipboard, Web Share API

---

## 🚀 Quick Start

\`\`\`bash
npm install
npm run dev        # → http://localhost:5173
\`\`\`

## 🏗️ Build

\`\`\`bash
npm run build      # compiles to dist/ and regenerates README
npm run preview    # preview the production build
\`\`\`

---

## 📁 File Structure

\`\`\`
qr-forge/
├─ .githooks/
│  └─ pre-commit          # runs generate-readme before every commit
├─ dist/                  # production build output (git-ignored)
│  ├─ assets/
│  │  ├─ index-*.css
│  │  └─ index-*.js
│  └─ index.html
├─ scripts/
│  └─ generate-readme.js  # this script
├─ src/
│  ├─ main.js             # all app logic
│  └─ style.css           # Tailwind v4 + custom CSS
├─ .gitignore
├─ index.html             # app entry point
├─ package.json
├─ README.md              # auto-generated — do not edit manually
└─ vite.config.js         # Vite + Tailwind + CORS proxy config
\`\`\`

---

## 🔧 How the CORS proxy works

Direct \`fetch()\` calls to file hosting APIs from \`localhost\` are
blocked by CORS. Vite's built-in proxy routes requests server-side:

\`\`\`
Browser  →  /proxy/catbox/user/api.php    (same-origin → allowed)
Vite     →  catbox.moe/user/api.php       (server-to-server → no CORS)
\`\`\`

Configured in \`vite.config.js\` under \`server.proxy\`.

---

## 📦 Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| \`qrcode\` | ${pkg.dependencies.qrcode} | QR canvas generation |
| \`vite\` | ${pkg.devDependencies.vite} | Dev server + bundler |
| \`tailwindcss\` | ${pkg.devDependencies.tailwindcss} | Utility CSS |
| \`@tailwindcss/vite\` | ${pkg.devDependencies['@tailwindcss/vite']} | Tailwind v4 Vite plugin |

---

## 📄 License

MIT © ${year} QR Forge

---

*README auto-generated on ${built} by \`scripts/generate-readme.js\`*
`

writeFileSync(resolve(ROOT, 'README.md'), readme, 'utf8')
console.log(`✓ README.md generated (${readme.length} chars)`)
