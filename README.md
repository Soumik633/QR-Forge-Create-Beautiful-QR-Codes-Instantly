# qr-forge v2.0.0

> Stylish QR Code Generator — Vite + Tailwind CSS v4

![Version](https://img.shields.io/badge/version-2.0.0-7c3aed?style=flat-square)
![Vite](https://img.shields.io/badge/vite-6-646cff?style=flat-square&logo=vite)
![Tailwind](https://img.shields.io/badge/tailwind-4-06b6d4?style=flat-square&logo=tailwindcss)
![License](https://img.shields.io/badge/license-MIT-10b981?style=flat-square)

---
For Testing Purpose You Can Visit :- https://qrforgebysoumik.netlify.app/

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

```bash
npm install
npm run dev        # → http://localhost:5173
```

## 🏗️ Build

```bash
npm run build      # compiles to dist/ and regenerates README
npm run preview    # preview the production build
```

---

## 📁 File Structure

```
qr-forge v2.0.0/
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
```

---

## 🔧 How the CORS proxy works

Direct `fetch()` calls to file hosting APIs from `localhost` are
blocked by CORS. Vite's built-in proxy routes requests server-side:

```
Browser  →  /proxy/catbox/user/api.php    (same-origin → allowed)
Vite     →  catbox.moe/user/api.php       (server-to-server → no CORS)
```

Configured in `vite.config.js` under `server.proxy`.

---

## 📦 Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `qrcode` | ^1.5.3 | QR canvas generation |
| `vite` | ^6.3.3 | Dev server + bundler |
| `tailwindcss` | ^4.1.4 | Utility CSS |
| `@tailwindcss/vite` | ^4.1.4 | Tailwind v4 Vite plugin |

---

## 📄 License

MIT © 2026 Soumik Pal QR Forge

---

*README auto-generated on 2026-05-12 by `scripts/generate-readme.js`*
