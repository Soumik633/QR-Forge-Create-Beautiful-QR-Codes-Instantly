#!/usr/bin/env node
/**
 * generate-readme.js
 * ------------------
 * Scans the project directory and updates the "File Structure"
 * section of README.md automatically on every git commit.
 *
 * Run manually:  node scripts/generate-readme.js
 * Auto-run:      via .githooks/pre-commit  (set up by `npm install`)
 */

import fs   from 'fs';
import path from 'path';

// ── Config ────────────────────────────────────────────────────────────────────

/** Folders / files to skip entirely */
const IGNORE = new Set([
  'node_modules',
  '.git',
  '.githooks',
  'scripts',        // hide this helper dir from the tree (optional – remove to show it)
]);

/** Extensions to label with an icon */
const EXT_ICONS = {
  '.js':   '🟨',
  '.mjs':  '🟨',
  '.cjs':  '🟨',
  '.ts':   '🟦',
  '.tsx':  '🟦',
  '.jsx':  '🟨',
  '.css':  '🎨',
  '.html': '🌐',
  '.json': '📋',
  '.md':   '📝',
  '.svg':  '🖼️',
  '.png':  '🖼️',
  '.jpg':  '🖼️',
  '.ico':  '🖼️',
  '.sh':   '⚙️',
  '.lock': '🔒',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function icon(entry) {
  if (entry.isDirectory()) return '📂';
  const ext = path.extname(entry.name).toLowerCase();
  return EXT_ICONS[ext] ?? '📄';
}

/**
 * Recursively build tree lines.
 * @param {string} dir      – absolute path of directory to scan
 * @param {string} prefix   – indentation/connector prefix for children
 * @returns {string[]}
 */
function buildTree(dir, prefix = '') {
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(e => !IGNORE.has(e.name))
    .sort((a, b) => {
      // directories first, then alphabetical
      if (a.isDirectory() !== b.isDirectory())
        return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  const lines = [];

  entries.forEach((entry, i) => {
    const isLast      = i === entries.length - 1;
    const connector   = isLast ? '└─' : '├─';
    const childPrefix = prefix + (isLast ? '   ' : '│  ');
    const ico         = icon(entry);

    if (entry.isDirectory()) {
      lines.push(`${prefix}${connector} ${ico} ${entry.name}/`);
      lines.push(...buildTree(path.join(dir, entry.name), childPrefix));
    } else {
      lines.push(`${prefix}${connector} ${ico} ${entry.name}`);
    }
  });

  return lines;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const ROOT        = path.resolve('.');
const projectName = path.basename(ROOT);
const readmePath  = path.join(ROOT, 'README.md');

// Build tree string
const treeLines = [`📁 ${projectName}/`, ...buildTree(ROOT)];
const treeBlock = '```\n' + treeLines.join('\n') + '\n```';

// Section markers (HTML comments — invisible on GitHub)
const START = '<!-- FILE_TREE_START -->';
const END   = '<!-- FILE_TREE_END -->';

// ── Read or create README ─────────────────────────────────────────────────────

let content = '';

if (fs.existsSync(readmePath)) {
  content = fs.readFileSync(readmePath, 'utf8');
} else {
  // First-time template
  content = `# ${projectName}

> Stylish QR Code Generator built with **Vite + Tailwind CSS v4**

Generate QR codes from text, URLs, or uploaded files — with custom styles,
colors, error-correction levels, and optional center logos.
All processing is done in the browser; file uploads use the free
[tmpfiles.org](https://tmpfiles.org) service as a temporary CDN.

---

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

\`\`\`bash
# Install dependencies (also sets up the git hook)
npm install

# Start dev server
npm run dev

# Production build → dist/
npm run build

# Preview the production build
npm run preview
\`\`\`

---

## 📁 File Structure

${START}
${END}

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

MIT © ${new Date().getFullYear()} — free to use and modify.
`;
}

// ── Inject / replace tree section ─────────────────────────────────────────────

const newBlock = `${START}\n${treeBlock}\n${END}`;

if (content.includes(START) && content.includes(END)) {
  // Replace existing block
  content = content.replace(
    new RegExp(`${START}[\\s\\S]*?${END}`),
    newBlock
  );
} else {
  // Append a new section at the end
  content = content.trimEnd() + `\n\n## 📁 File Structure\n\n${newBlock}\n`;
}

fs.writeFileSync(readmePath, content, 'utf8');
console.log('✅  README.md › File Structure updated');
