/**
 * QR Forge v2 — src/main.js
 * Vite + Tailwind CSS
 *
 * FILE UPLOAD STRATEGY (no server, no disk storage):
 * ─────────────────────────────────────────────────────────────────
 * Vite proxy routes all upload requests through localhost.
 * Server-to-server calls have zero CORS restrictions.
 *
 * Provider chain: catbox.moe → tmpfiles.org → gofile.io → blob fallback
 * ─────────────────────────────────────────────────────────────────
 */

import './style.css'
import QRCode from 'qrcode'

// ── State ──────────────────────────────────────────────────────
let currentMode       = 'text'
let logoMode          = 'none'
let customLogoDataURL = null
let currentQRDataURL  = null
let uploadedFile      = null
let qrHistory         = []
let qrStyle           = 'square'

try {
  qrHistory = JSON.parse(localStorage.getItem('qr-history-v2') || '[]')
} catch (_) { qrHistory = [] }

// ── Constants ──────────────────────────────────────────────────
const ECC_MAP  = { H: 'H', Q: 'Q', M: 'M', L: 'L' }
const IS_DEV   = import.meta.env.DEV
const MAX_SIZE = 200 * 1024 * 1024
const ALLOWED_TYPES = [
  'image/', 'video/', 'application/pdf',
  'text/', 'application/msword',
  'application/vnd.openxmlformats'
]

// ── Default Logo ───────────────────────────────────────────────
const DEFAULT_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="16" fill="url(#lg)"/>
  <rect x="10" y="10" width="18" height="18" rx="4" fill="white"/>
  <rect x="36" y="10" width="18" height="18" rx="4" fill="white"/>
  <rect x="10" y="36" width="18" height="18" rx="4" fill="white"/>
  <rect x="38" y="38" width="10" height="10" rx="2" fill="white"/>
  <rect x="36" y="36" width="7"  height="7"  rx="1" fill="white"/>
</svg>`
const DEFAULT_LOGO_URL =
  'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(DEFAULT_LOGO_SVG)))

// ── DOM helper ─────────────────────────────────────────────────
const $ = id => document.getElementById(id)

// ═══════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  renderHistory()
  initDropZone()

  // Size slider live label
  $('qr-size').addEventListener('input', () => {
    $('size-val').textContent = $('qr-size').value + 'px'
  })

  // Set default active style button
  document.querySelectorAll('.style-opt').forEach(b => {
    b.classList.toggle('active', b.dataset.style === qrStyle)
  })
})

// ═══════════════════════════════════════════════════════════════
//  UI CONTROLS  (all on window so inline onclick="" works)
// ═══════════════════════════════════════════════════════════════

// ── Mode switch ────────────────────────────────────────────────
window.switchMode = (mode) => {
  currentMode = mode
  $('panel-text').classList.toggle('active', mode === 'text')
  $('panel-media').classList.toggle('active', mode === 'media')
  $('btn-text').classList.toggle('active', mode === 'text')
  $('btn-media').classList.toggle('active', mode === 'media')
}

// ── Logo mode ──────────────────────────────────────────────────
window.setLogoMode = (mode) => {
  logoMode = mode
  ;['none', 'default', 'custom'].forEach(m => {
    $('logo-' + m).classList.toggle('active', m === mode)
  })
  $('logo-upload-area').classList.toggle('show', mode === 'custom')
}

window.handleLogoUpload = (input) => {
  const file = input.files[0]
  if (!file || !file.type.startsWith('image/')) {
    showStatus('Please upload an image for the logo', 'error')
    return
  }
  const reader = new FileReader()
  reader.onload = e => {
    customLogoDataURL = e.target.result
    $('logo-preview-img').src             = customLogoDataURL
    $('logo-preview-fname').textContent   = file.name
    $('logo-preview-row').classList.add('show')
  }
  reader.readAsDataURL(file)
}

window.clearLogo = () => {
  customLogoDataURL = null
  $('logo-file').value = ''
  $('logo-preview-row').classList.remove('show')
}

// ── QR module style ────────────────────────────────────────────
window.setQRStyle = (style) => {
  qrStyle = style
  document.querySelectorAll('.style-opt').forEach(b => {
    b.classList.toggle('active', b.dataset.style === style)
  })
  // Update the badge label in the preview panel
  const lbl = $('qr-style-label')
  if (lbl) lbl.textContent = style
}

// ── Advanced panel toggle ──────────────────────────────────────
window.toggleAdvanced = () => {
  $('adv-panel').classList.toggle('open')
  $('adv-toggle').classList.toggle('open')
}

// ── File select ────────────────────────────────────────────────
window.handleFileSelect = (input) => {
  const file   = input.files[0]
  if (!file) return
  const errEl  = $('file-error')
  const infoEl = $('file-badge')

  if (file.size > MAX_SIZE) {
    errEl.textContent = '✕ File too large (max 200 MB)'
    errEl.classList.add('show')
    infoEl.classList.remove('show')
    return
  }
  if (!ALLOWED_TYPES.some(t => file.type.startsWith(t))) {
    errEl.textContent = '✕ File type not supported'
    errEl.classList.add('show')
    infoEl.classList.remove('show')
    return
  }

  errEl.classList.remove('show')
  uploadedFile = file
  infoEl.innerHTML = `<span>✓</span><span>${file.name} (${(file.size / 1024).toFixed(1)} KB) — ready to upload</span>`
  infoEl.classList.add('show')

  const dz = $('drop-zone')
  dz.querySelector('.drop-icon').textContent  = getFileEmoji(file.type)
  dz.querySelector('.drop-title').textContent = file.name
}

// ── Download / Copy / Share ────────────────────────────────────
window.downloadQR = () => {
  if (!currentQRDataURL) return
  const a    = document.createElement('a')
  a.href     = currentQRDataURL
  a.download = 'qrforge-' + Date.now() + '.png'
  a.click()
}

window.copyQR = async () => {
  if (!currentQRDataURL) return
  try {
    const blob = await (await fetch(currentQRDataURL)).blob()
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    showStatus('Copied to clipboard!', 'success')
  } catch (_) {
    showStatus('Copy failed — try Download instead', 'error')
  }
}

window.shareQR = async () => {
  if (!currentQRDataURL || !navigator.share) {
    showStatus('Share not supported in this browser — use Download', 'info')
    return
  }
  try {
    const blob = await (await fetch(currentQRDataURL)).blob()
    const file = new File([blob], 'qrforge.png', { type: 'image/png' })
    await navigator.share({ title: 'QR Code', files: [file] })
  } catch (_) {}
}

// ── History: clear all (FIX — was broken because renderHistory
//   was private; now both are on window) ──────────────────────
window.clearAllHistory = () => {
  qrHistory = []
  try { localStorage.removeItem('qr-history-v2') } catch (_) {}
  renderHistory()
}

// ── History: delete single entry ──────────────────────────────
window.deleteHistory = (e, i) => {
  e.stopPropagation()   // prevent restoreHistory firing on parent
  qrHistory.splice(i, 1)
  try { localStorage.setItem('qr-history-v2', JSON.stringify(qrHistory)) } catch (_) {}
  renderHistory()
}

// ── History: restore ──────────────────────────────────────────
window.restoreHistory = (i) => {
  const item       = qrHistory[i]
  currentQRDataURL = item.dataURL
  const canvas     = $('qr-canvas')
  const img        = new Image()
  img.onload = () => {
    canvas.width  = img.width
    canvas.height = img.height
    canvas.getContext('2d').drawImage(img, 0, 0)
    canvas.classList.remove('hidden')
    canvas.classList.add('qr-canvas-visible')
    $('qr-placeholder').style.display = 'none'
    $('qr-frame').classList.add('has-qr')
    $('download-btn').disabled = false
    $('copy-btn').disabled     = false
    $('share-btn').disabled    = false
    showStatus('Restored from history', 'success')
  }
  img.src = item.dataURL
}

// ═══════════════════════════════════════════════════════════════
//  INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════

function getFileEmoji(type) {
  if (type.startsWith('image/'))  return '🖼️'
  if (type.startsWith('video/'))  return '🎬'
  if (type === 'application/pdf') return '📄'
  return '📁'
}

function showStatus(msg, type = 'info') {
  const bar     = $('status-bar')
  bar.className = 'status-bar show ' + type
  bar.innerHTML = type === 'loading'
    ? `<div class="spinner"></div><span>${msg}</span>`
    : `<span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span><span>${msg}</span>`
}
function hideStatus() { $('status-bar').classList.remove('show') }

function saveHistory(text, dataURL) {
  const label = text.startsWith('data:')
    ? '[Media file]'
    : text.length > 48 ? text.slice(0, 48) + '…' : text

  qrHistory.unshift({ text: label, dataURL, time: new Date().toLocaleTimeString() })
  if (qrHistory.length > 12) qrHistory = qrHistory.slice(0, 12)
  try { localStorage.setItem('qr-history-v2', JSON.stringify(qrHistory)) } catch (_) {}
  renderHistory()
}

// renderHistory is called from window.clearAllHistory — must stay accessible
function renderHistory() {
  const list = $('history-list')
  if (!list) return
  if (!qrHistory.length) {
    list.innerHTML = `<p class="text-center text-xs py-3" style="color:var(--color-text-3)">No history yet</p>`
    return
  }
  list.innerHTML = qrHistory.map((item, i) => `
    <div class="history-item" id="hist-${i}">
      <div class="w-8 h-8 rounded-md overflow-hidden flex-shrink-0 bg-white cursor-pointer"
           onclick="restoreHistory(${i})">
        <img src="${item.dataURL}" alt="QR" class="w-full h-full object-cover">
      </div>
      <div class="flex-1 min-w-0 cursor-pointer" onclick="restoreHistory(${i})">
        <div class="text-xs truncate"
             style="color:var(--color-text-1);font-family:var(--font-mono)">${escHtml(item.text)}</div>
        <div class="text-xs mt-0.5" style="color:var(--color-text-3)">${item.time}</div>
      </div>
      <button class="history-delete-btn" onclick="deleteHistory(event,${i})" title="Remove">✕</button>
    </div>
  `).join('')
}

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── Drop zone drag-and-drop ────────────────────────────────────
function initDropZone() {
  const dz = $('drop-zone')
  if (!dz) return
  dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('dragover') })
  dz.addEventListener('dragleave', ()  => dz.classList.remove('dragover'))
  dz.addEventListener('drop', e => {
    e.preventDefault()
    dz.classList.remove('dragover')
    const file = e.dataTransfer.files[0]
    if (file) {
      const input = $('file-input')
      const dt    = new DataTransfer()
      dt.items.add(file)
      input.files = dt.files
      window.handleFileSelect(input)
    }
  })
}

// ═══════════════════════════════════════════════════════════════
//  UPLOAD — Vite proxy chain (solves all CORS issues)
//
//  How it works:
//    fetch('/proxy/catbox/...')
//    → Vite dev server forwards to https://catbox.moe/... server-side
//    → Server-to-server: no CORS rules, always succeeds
//
//  Proxy config lives in vite.config.js
// ═══════════════════════════════════════════════════════════════

async function uploadToCatbox(file) {
  const fd = new FormData()
  fd.append('reqtype', 'fileupload')
  fd.append('fileToUpload', file)
  const url = IS_DEV ? '/proxy/catbox/user/api.php' : 'https://catbox.moe/user/api.php'
  const res = await fetch(url, { method: 'POST', body: fd })
  if (!res.ok) throw new Error(`catbox HTTP ${res.status}`)
  const text = (await res.text()).trim()
  if (!text.startsWith('https://')) throw new Error('catbox bad response')
  return text
}

async function uploadToTmpfiles(file) {
  const fd = new FormData()
  fd.append('file', file)
  const url = IS_DEV ? '/proxy/tmpfiles/api/v1/upload' : 'https://tmpfiles.org/api/v1/upload'
  const res = await fetch(url, { method: 'POST', body: fd })
  if (!res.ok) throw new Error(`tmpfiles HTTP ${res.status}`)
  const data = await res.json()
  const link = data?.data?.url
  if (!link) throw new Error('tmpfiles no url in response')
  return link.replace('tmpfiles.org/', 'tmpfiles.org/dl/')
}

async function uploadToGofile(file) {
  const srvUrl = IS_DEV ? '/proxy/gofile/servers' : 'https://api.gofile.io/servers'
  const srvRes = await fetch(srvUrl)
  if (!srvRes.ok) throw new Error(`gofile servers HTTP ${srvRes.status}`)
  const server = (await srvRes.json())?.data?.servers?.[0]?.name
  if (!server) throw new Error('gofile no server')
  const fd = new FormData()
  fd.append('file', file)
  const upRes = await fetch(`https://${server}.gofile.io/contents/uploadfile`, { method: 'POST', body: fd })
  if (!upRes.ok) throw new Error(`gofile upload HTTP ${upRes.status}`)
  const link = (await upRes.json())?.data?.downloadPage
  if (!link) throw new Error('gofile no download page')
  return link
}

async function uploadFile(file) {
  const prog = $('upload-progress')
  const bar  = $('upload-progress-bar')
  prog.classList.add('show')
  bar.style.width = '10%'

  const tick = setInterval(() => {
    const w = parseFloat(bar.style.width)
    if (w < 82) bar.style.width = (w + 3) + '%'
  }, 220)

  const finish = () => {
    clearInterval(tick)
    bar.style.width = '100%'
    setTimeout(() => { prog.classList.remove('show'); bar.style.width = '0%' }, 600)
  }

  const providers = [
    { name: 'catbox.moe',   fn: () => uploadToCatbox(file)   },
    { name: 'tmpfiles.org', fn: () => uploadToTmpfiles(file) },
    { name: 'gofile.io',    fn: () => uploadToGofile(file)   },
  ]

  for (const p of providers) {
    try {
      showStatus(`Uploading via ${p.name}…`, 'loading')
      const url = await p.fn()
      finish()
      showStatus('✓ Uploaded! Generating QR…', 'success')
      return url
    } catch (err) {
      console.warn(`[QR Forge] ${p.name} failed:`, err.message)
    }
  }

  // All cloud providers failed → local blob (last resort)
  finish()
  showStatus('⚠️ Upload services unreachable. QR is local-only (this device/session).', 'info')
  return URL.createObjectURL(file)
}

// ═══════════════════════════════════════════════════════════════
//  QR GENERATION
// ═══════════════════════════════════════════════════════════════

window.generateQR = async () => {
  const btn       = document.querySelector('.btn-generate')
  btn.disabled    = true
  btn.textContent = 'Generating…'
  hideStatus()

  try {
    let content = ''

    if (currentMode === 'text') {
      content = $('text-input').value.trim()
      if (!content) {
        $('text-error').classList.add('show')
        showStatus('Please enter some text or a URL', 'error')
        return
      }
      $('text-error').classList.remove('show')

    } else {
      if (!uploadedFile) {
        $('file-error').textContent = '✕ Please select a file first'
        $('file-error').classList.add('show')
        showStatus('Please select a file', 'error')
        return
      }
      $('file-error').classList.remove('show')
      content = await uploadFile(uploadedFile)
    }

    showStatus('Rendering QR code…', 'loading')

    const qrColor  = $('qr-color').value
    const bgColor  = $('bg-color').value
    const size     = parseInt($('qr-size').value, 10)
    const eccLevel = ECC_MAP[$('ecc-level').value] || 'H'

    const canvas  = $('qr-canvas')
    canvas.width  = size
    canvas.height = size

    await QRCode.toCanvas(canvas, content, {
      errorCorrectionLevel: eccLevel,
      width:  size,
      margin: 2,
      color:  { dark: qrColor, light: bgColor }
    })

    if (qrStyle !== 'square') applyQRStyle(canvas, qrStyle, qrColor, bgColor)
    if (logoMode !== 'none') {
      const logoURL = logoMode === 'default' ? DEFAULT_LOGO_URL : customLogoDataURL
      if (logoMode === 'custom' && !customLogoDataURL) {
        showStatus('Please upload a logo image first', 'error')
        return
      }
      if (logoURL) await overlayLogo(canvas, logoURL, size)
    }

    $('qr-placeholder').style.display = 'none'
    canvas.classList.remove('hidden')
    canvas.classList.add('qr-canvas-visible')
    $('qr-frame').classList.add('has-qr')

    currentQRDataURL = canvas.toDataURL('image/png')
    $('download-btn').disabled = false
    $('copy-btn').disabled     = false
    $('share-btn').disabled    = false

    showStatus('QR code generated!', 'success')
    saveHistory(content, currentQRDataURL)

  } catch (err) {
    const msg   = err.message || 'Something went wrong'
    const clean = msg.includes('Failed to fetch')
      ? 'Upload failed: check your internet connection and try again.'
      : 'Error: ' + msg
    showStatus(clean, 'error')
    console.error('[QR Forge]', err)
  } finally {
    btn.disabled    = false
    btn.textContent = 'Generate QR Code →'
  }
}

// ── QR dot style renderer ──────────────────────────────────────
function applyQRStyle(canvas, style, darkColor, lightColor) {
  const ctx  = canvas.getContext('2d')
  const size = canvas.width
  const img  = ctx.getImageData(0, 0, size, size)

  let modSize = 1
  for (let x = 0; x < size; x++) {
    if (img.data[x * 4] < 128) { modSize = x; break }
  }
  if (modSize < 1) modSize = Math.round(size / 37)

  const modules = Math.round(size / modSize)
  ctx.fillStyle  = lightColor
  ctx.fillRect(0, 0, size, size)

  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      const px    = Math.floor(col * modSize + modSize / 2)
      const py    = Math.floor(row * modSize + modSize / 2)
      const idx   = (py * size + px) * 4
      if (img.data[idx] >= 128) continue  // light module — skip

      const x = col * modSize
      const y = row * modSize
      const r = modSize / 2

      ctx.fillStyle = darkColor
      ctx.beginPath()

      if (style === 'dots') {
        ctx.arc(x + r, y + r, r * 0.85, 0, Math.PI * 2)
      } else if (style === 'rounded') {
        const rad = r * 0.45
        ctx.moveTo(x + rad, y)
        ctx.lineTo(x + modSize - rad, y)
        ctx.quadraticCurveTo(x + modSize, y,          x + modSize, y + rad)
        ctx.lineTo(x + modSize, y + modSize - rad)
        ctx.quadraticCurveTo(x + modSize, y + modSize, x + modSize - rad, y + modSize)
        ctx.lineTo(x + rad, y + modSize)
        ctx.quadraticCurveTo(x, y + modSize,            x, y + modSize - rad)
        ctx.lineTo(x, y + rad)
        ctx.quadraticCurveTo(x, y,                     x + rad, y)
      }
      ctx.closePath()
      ctx.fill()
    }
  }
}

// ── Logo overlay ───────────────────────────────────────────────
function overlayLogo(canvas, logoURL, size) {
  return new Promise(resolve => {
    const img        = new Image()
    img.crossOrigin  = 'anonymous'
    img.onload = () => {
      const ctx    = canvas.getContext('2d')
      const ls     = size * 0.22
      const lx     = (size - ls) / 2
      const ly     = (size - ls) / 2
      const pad    = ls * 0.14
      const outerR = ls * 0.22

      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,0.25)'
      ctx.shadowBlur  = 14
      ctx.fillStyle   = 'white'
      rrect(ctx, lx - pad, ly - pad, ls + pad * 2, ls + pad * 2, outerR)
      ctx.fill()
      ctx.restore()

      ctx.save()
      rrect(ctx, lx, ly, ls, ls, ls * 0.18)
      ctx.clip()
      ctx.drawImage(img, lx, ly, ls, ls)
      ctx.restore()

      resolve()
    }
    img.onerror = () => resolve()
    img.src     = logoURL
  })
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y,          x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h,      x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h,          x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y,              x + r, y)
  ctx.closePath()
}
