# QR-Forge-Create-Beautiful-QR-Codes-Instantly

> Stylish QR Code Generator built with **Vite + Tailwind CSS v4**

Generate QR codes from text, URLs, or uploaded files — with custom styles,
colors, error-correction levels, and optional center logos.
All processing is done in the browser; file uploads use the free
[tmpfiles.org](https://tmpfiles.org) service as a temporary CDN.

---
For Testing Purpose You Can Visit :- https://qrforgebysoumik.netlify.app/

## ✨ Features

- Square / Rounded / Dot QR module styles
- Custom foreground & background colors
- Adjustable size (200 – 800 px) and error-correction level (L / M / Q / H)
- Center logo overlay (drag-and-drop or browse)
- Browser-safe file upload → QR link (no server required)
- Recent QR history (localStorage)
- One-click PNG download, clipboard copy, and Web Share API

---

## 🚀 Getting Started

```bash
# Install dependencies (also sets up the git hook)
npm install

# Start dev server
npm run dev

# Production build → dist/
npm run build

# Preview the production build
npm run preview
```

---

## 📁 File Structure

<!-- FILE_TREE_START -->
```
📁 qr-forge-v2/
├─ 📂 dist/
│  ├─ 📂 assets/
│  │  ├─ 🎨 index-DG5_EnWw.css
│  │  └─ 🟨 index-DpS71PZt.js
│  └─ 🌐 index.html
├─ 📂 src/
│  ├─ 🟨 main.js
│  └─ 🎨 style.css
├─ 🌐 index.html
├─ 📋 package-lock.json
├─ 📋 package.json
└─ 🟨 vite.config.js
```
<!-- FILE_TREE_END -->

---

## 🛠️ Tech Stack

| Tool | Role |
|------|------|
| [Vite 6](https://vitejs.dev) | Build tool & dev server |
| [Tailwind CSS v4](https://tailwindcss.com) | Utility-first styling |
| [qrcode](https://www.npmjs.com/package/qrcode) | QR generation (canvas) |
| [tmpfiles.org](https://tmpfiles.org) | Temporary file hosting |

---

## 📄 License

MIT © 2026 — free to use and modify.
