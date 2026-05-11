/**
 * QR Forge v2 — main.js
 * Vite + Tailwind CSS
 *
 * FILE UPLOAD STRATEGY (browser-safe, no uploads folder bloat):
 * ─────────────────────────────────────────────────────────
 * The browser first posts to Vite's /api/tmpfiles proxy. If the app is opened
 * with Live Server or another static server, it falls back to tmpfiles.org
 * directly. The temporary file host returns a URL, and that URL is encoded into
 * the QR.
 *
 * Files are not saved in this app or on the user's disk.
 * ─────────────────────────────────────────────────────────
 */

import './style.css'
import QRCode from 'qrcode'

// ── State ─────────────────────────────────────────────────────
let currentMode       = 'text'
let logoMode          = 'none'
let customLogoDataURL = null
let currentQRDataURL  = null
let uploadedFile      = null
let qrHistory         = []
let qrStyle           = 'square'  // square | rounded | dots

try {
  qrHistory = JSON.parse(localStorage.getItem('qr-history-v2') || '[]')
} catch (_) { qrHistory = [] }

// ── Default Logo SVG ──────────────────────────────────────────
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
  <rect x="36" y="36" width="7" height="7" rx="1" fill="white"/>
</svg>`
const DEFAULT_LOGO_URL = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(DEFAULT_LOGO_SVG)))

// ── ECC map ───────────────────────────────────────────────────
const ECC_MAP = { H: 'H', Q: 'Q', M: 'M', L: 'L' }

// ── DOM refs ──────────────────────────────────────────────────
const $ = id => document.getElementById(id)

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderHistory()
  initDropZone()
  initSizeSlider()
  buildQRStylePreviewDots()
})

// ── Mode Switch ───────────────────────────────────────────────
window.switchMode = (mode) => {
  currentMode = mode
  $('panel-text').classList.toggle('active', mode === 'text')
  $('panel-media').classList.toggle('active', mode === 'media')
  $('btn-text').classList.toggle('active', mode === 'text')
  $('btn-media').classList.toggle('active', mode === 'media')
}

// ── Logo Mode ─────────────────────────────────────────────────
window.setLogoMode = (mode) => {
  logoMode = mode
  ;['none','default','custom'].forEach(m => {
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
    $('logo-preview-img').src = customLogoDataURL
    $('logo-preview-fname').textContent = file.name
    $('logo-preview-row').classList.add('show')
  }
  reader.readAsDataURL(file)
}

window.clearLogo = () => {
  customLogoDataURL = null
  $('logo-file').value = ''
  $('logo-preview-row').classList.remove('show')
}

// ── QR Style ──────────────────────────────────────────────────
window.setQRStyle = (style) => {
  qrStyle = style
  document.querySelectorAll('.style-opt').forEach(b => {
    b.classList.toggle('active', b.dataset.style === style)
  })
}

function buildQRStylePreviewDots() {
  // Just sets the default active state
  document.querySelectorAll('.style-opt').forEach(b => {
    b.classList.toggle('active', b.dataset.style === qrStyle)
  })
}

// ── Advanced Toggle ───────────────────────────────────────────
window.toggleAdvanced = () => {
  $('adv-panel').classList.toggle('open')
  $('adv-toggle').classList.toggle('open')
}

// ── Size slider label ─────────────────────────────────────────
function initSizeSlider() {
  $('qr-size').addEventListener('input', () => {
    $('size-val').textContent = $('qr-size').value + 'px'
  })
}

// ── Status bar ────────────────────────────────────────────────
function showStatus(msg, type = 'info') {
  const bar = $('status-bar')
  bar.className = 'status-bar show ' + type
  bar.replaceChildren()

  if (type === 'loading') {
    const spinner = document.createElement('div')
    spinner.className = 'spinner'
    bar.append(spinner)
  } else {
    const icon = document.createElement('span')
    icon.textContent = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'
    bar.append(icon)
  }

  const text = document.createElement('span')
  text.textContent = msg
  bar.append(text)
}
function hideStatus() { $('status-bar').classList.remove('show') }

// ── Drop zone ─────────────────────────────────────────────────
function initDropZone() {
  const dz = $('drop-zone')
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover') })
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'))
  dz.addEventListener('drop', e => {
    e.preventDefault()
    dz.classList.remove('dragover')
    const file = e.dataTransfer.files?.[0]
    if (file) setSelectedFile(file)
  })
}

const UPLOAD_ENDPOINTS = [
  { label: 'local upload proxy', url: '/api/tmpfiles' },
  { label: 'tmpfiles.org', url: 'https://tmpfiles.org/api/v1/upload' }
]
const MAX_SIZE = 100 * 1024 * 1024 // 100MB
const ALLOWED_MIME_PREFIXES = ['image/', 'video/', 'text/']
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
])
const ALLOWED_EXTENSIONS = new Set([
  '.bmp', '.doc', '.docx', '.gif', '.jpeg', '.jpg', '.pdf',
  '.png', '.svg', '.txt', '.webp', '.mp4', '.mov', '.webm'
])

window.handleFileSelect = (input) => {
  const file = input.files?.[0]
  setSelectedFile(file)
}

function setSelectedFile(file) {
  if (!file) return

  const errEl  = $('file-error')
  const infoEl = $('file-badge')

  if (file.size > MAX_SIZE) {
    errEl.textContent = '✕ File too large (max 100 MB)'
    errEl.classList.add('show')
    infoEl.classList.remove('show')
    uploadedFile = null
    return
  }
  if (!isAllowedFile(file)) {
    errEl.textContent = '✕ File type not supported'
    errEl.classList.add('show')
    infoEl.classList.remove('show')
    uploadedFile = null
    return
  }

  errEl.classList.remove('show')
  errEl.textContent = ''
  uploadedFile = file

  const icon = document.createElement('span')
  icon.textContent = '✓'
  const label = document.createElement('span')
  label.textContent = `${file.name} (${formatFileSize(file.size)}) — ready to upload`
  infoEl.replaceChildren(icon, label)
  infoEl.classList.add('show')

  const dz = $('drop-zone')
  dz.querySelector('.drop-icon').textContent = getFileEmoji(file)
  dz.querySelector('.drop-title').textContent = file.name
}

function isAllowedFile(file) {
  const type = (file.type || '').toLowerCase()
  const name = (file.name || '').toLowerCase()
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : ''

  return ALLOWED_MIME_PREFIXES.some(prefix => type.startsWith(prefix)) ||
    ALLOWED_MIME_TYPES.has(type) ||
    ALLOWED_EXTENSIONS.has(ext)
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

function getFileEmoji(file) {
  const type = (file.type || '').toLowerCase()
  const name = (file.name || '').toLowerCase()
  if (type.startsWith('image/'))  return '🖼️'
  if (type.startsWith('video/'))  return '🎬'
  if (type === 'application/pdf') return '📄'
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name)) return '🖼️'
  if (/\.(mp4|mov|webm)$/.test(name)) return '🎬'
  if (name.endsWith('.pdf')) return '📄'
  return '📁'
}

// ── Temporary File Upload (NO uploads folder) ─────────────
/**
 * Uploads through the Vite same-origin proxy so the browser is not blocked by
 * third-party CORS rules. Returns a public temporary download URL.
 */
async function uploadTemporaryFile(file) {
  const prog = $('upload-progress')
  const bar  = $('upload-progress-bar')
  let timer = null
  let timeout = null

  prog.classList.add('show')
  bar.style.width = '30%'

  try {
    showStatus('Uploading to temporary file host…', 'loading')

    timer = setInterval(() => {
      const current = parseFloat(bar.style.width)
      if (current < 85) bar.style.width = (current + 5) + '%'
    }, 200)

    let lastError = null

    for (const endpoint of UPLOAD_ENDPOINTS) {
      const controller = new AbortController()
      timeout = setTimeout(() => controller.abort(), 90000)

      try {
        const response = await fetch(endpoint.url, {
          method: 'POST',
          body: createUploadFormData(file),
          signal: controller.signal
        })

        clearTimeout(timeout)
        timeout = null

        const data = await readUploadResponse(response)
        const link = extractUploadLink(data)

        if (response.ok && link) {
          clearInterval(timer)
          timer = null
          bar.style.width = '100%'
          setTimeout(() => { prog.classList.remove('show'); bar.style.width = '0%' }, 600)
          return normalizeUploadUrl(link)
        }

        lastError = createUploadResponseError(response, data, endpoint)
      } catch (err) {
        lastError = err
      } finally {
        if (timeout) clearTimeout(timeout)
        timeout = null
      }
    }

    throw lastError || new Error('Upload service did not return a link')

  } catch (err) {
    prog.classList.remove('show')
    bar.style.width = '0%'
    throw new Error(getUploadErrorMessage(err))
  } finally {
    if (timer) clearInterval(timer)
    if (timeout) clearTimeout(timeout)
  }
}

function createUploadFormData(file) {
  const formData = new FormData()
  formData.append('file', file, file.name)
  return formData
}

async function readUploadResponse(response) {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) return response.json()

  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch (_) {
    return text
  }
}

function extractUploadLink(data) {
  if (data?.status === 'success' && data.data?.url) return data.data.url
  if (data?.success && data.link) return data.link
  return ''
}

function createUploadResponseError(response, data, endpoint) {
  if (response.status === 404 && endpoint.url.startsWith('/')) {
    return new Error('Local upload proxy was not found')
  }

  const serverMessage = typeof data === 'object' && data
    ? data.message || data.error
    : data

  return new Error(`Upload service responded with ${response.status}${serverMessage ? `: ${serverMessage}` : ''}`)
}

function getUploadErrorMessage(err) {
  const message = err?.message || ''

  if (err?.name === 'AbortError') {
    return 'Upload timed out. Check your internet connection and try again.'
  }

  if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
    return 'Upload failed before reaching the upload service. Check your internet connection or start with npm run dev.'
  }

  return message || 'Upload failed'
}

function normalizeUploadUrl(rawUrl) {
  try {
    const url = new URL(rawUrl)

    if (url.hostname === 'tmpfiles.org') {
      url.protocol = 'https:'
      const parts = url.pathname.split('/').filter(Boolean)

      if (parts.length >= 2 && parts[0] !== 'dl') {
        return `https://tmpfiles.org/dl/${parts.join('/')}`
      }

      return url.href
    }
  } catch (_) {}

  return rawUrl
}

// ── Main QR Generation ────────────────────────────────────────
window.generateQR = async () => {
  const btn = document.querySelector('.btn-generate')
  btn.disabled = true
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

      // Upload through Vite's same-origin proxy, then encode the returned URL.
      content = await uploadTemporaryFile(uploadedFile)
      showStatus(`✓ Uploaded! Generating QR for: ${content}`, 'info')
    }

    showStatus('Rendering QR code…', 'loading')

    const qrColor   = $('qr-color').value
    const bgColor   = $('bg-color').value
    const size      = parseInt($('qr-size').value, 10)
    const eccLevel  = ECC_MAP[$('ecc-level').value] || 'H'

    // Generate QR using the `qrcode` npm package (supports canvas/SVG/dataURL)
    const canvas  = $('qr-canvas')
    canvas.width  = size
    canvas.height = size

    await QRCode.toCanvas(canvas, content, {
      errorCorrectionLevel: eccLevel,
      width:  size,
      margin: 2,
      color:  { dark: qrColor, light: bgColor }
    })

    // Apply dot style post-processing
    if (qrStyle !== 'square') {
      applyQRStyle(canvas, qrStyle, qrColor, bgColor)
    }

    // Overlay logo if needed
    if (logoMode !== 'none') {
      const logoURL = logoMode === 'default' ? DEFAULT_LOGO_URL : customLogoDataURL
      if (logoMode === 'custom' && !customLogoDataURL) {
        showStatus('Please upload a logo image first', 'error')
        return
      }
      if (logoURL) await overlayLogo(canvas, logoURL, size)
    }

    // Reveal canvas with animation
    const placeholder = $('qr-placeholder')
    placeholder.style.display = 'none'
    canvas.classList.remove('hidden')
    canvas.classList.add('qr-canvas-visible')

    // Activate frame glow + corners + scanline
    $('qr-frame').classList.add('has-qr')

    currentQRDataURL = canvas.toDataURL('image/png')
    $('download-btn').disabled = false
    $('copy-btn').disabled     = false
    $('share-btn').disabled    = false

    showStatus('QR code generated!', 'success')
    saveHistory(content, currentQRDataURL)

  } catch (err) {
    showStatus('Error: ' + err.message, 'error')
    console.error('[QR Forge]', err)
  } finally {
    btn.disabled    = false
    btn.textContent = 'Generate QR Code →'
  }
}

// ── QR Style Post-Processing ──────────────────────────────────
/**
 * Reads the raw QR canvas pixels and redraws modules as:
 *   'rounded' — rounded squares
 *   'dots'    — circles
 * This works by sampling the canvas at QR module positions.
 */
function applyQRStyle(canvas, style, darkColor, lightColor) {
  const ctx  = canvas.getContext('2d')
  const size = canvas.width
  const img  = ctx.getImageData(0, 0, size, size)

  // Detect module size by scanning top row
  let modSize = 1
  const threshold = 128
  for (let x = 0; x < size; x++) {
    const idx   = (x) * 4
    const isDark = img.data[idx] < threshold
    if (isDark) { modSize = x; break }
  }
  // Fallback detection
  if (modSize < 1) modSize = Math.round(size / 37)

  const modules = Math.round(size / modSize)
  ctx.fillStyle = lightColor
  ctx.fillRect(0, 0, size, size)

  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      const px = Math.floor(col * modSize + modSize / 2)
      const py = Math.floor(row * modSize + modSize / 2)
      const idx = (py * size + px) * 4
      const isDark = img.data[idx] < threshold
      if (!isDark) continue

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
        ctx.quadraticCurveTo(x + modSize, y, x + modSize, y + rad)
        ctx.lineTo(x + modSize, y + modSize - rad)
        ctx.quadraticCurveTo(x + modSize, y + modSize, x + modSize - rad, y + modSize)
        ctx.lineTo(x + rad, y + modSize)
        ctx.quadraticCurveTo(x, y + modSize, x, y + modSize - rad)
        ctx.lineTo(x, y + rad)
        ctx.quadraticCurveTo(x, y, x + rad, y)
      }
      ctx.closePath()
      ctx.fill()
    }
  }
}

// ── Logo Overlay ──────────────────────────────────────────────
function overlayLogo(canvas, logoURL, size) {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const ctx     = canvas.getContext('2d')
      const ls      = size * 0.22
      const lx      = (size - ls) / 2
      const ly      = (size - ls) / 2
      const pad     = ls * 0.14
      const outerR  = ls * 0.22

      // White padded background with shadow
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,0.25)'
      ctx.shadowBlur  = 14
      ctx.fillStyle   = 'white'
      rrect(ctx, lx - pad, ly - pad, ls + pad*2, ls + pad*2, outerR)
      ctx.fill()
      ctx.restore()

      // Clipped logo image
      ctx.save()
      rrect(ctx, lx, ly, ls, ls, ls * 0.18)
      ctx.clip()
      ctx.drawImage(img, lx, ly, ls, ls)
      ctx.restore()
      resolve()
    }
    img.onerror = () => resolve()
    img.src = logoURL
  })
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// ── Download ──────────────────────────────────────────────────
window.downloadQR = () => {
  if (!currentQRDataURL) return
  const a = document.createElement('a')
  a.href = currentQRDataURL
  a.download = 'qrforge-' + Date.now() + '.png'
  a.click()
}

// ── Copy ──────────────────────────────────────────────────────
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

// ── Share (Web Share API) ─────────────────────────────────────
window.shareQR = async () => {
  if (!currentQRDataURL || !navigator.share) {
    showStatus('Share not supported — use Download', 'info')
    return
  }
  try {
    const blob = await (await fetch(currentQRDataURL)).blob()
    const file = new File([blob], 'qrforge.png', { type: 'image/png' })
    await navigator.share({ title: 'QR Code', files: [file] })
  } catch (_) {}
}

// ── History ───────────────────────────────────────────────────
function saveHistory(text, dataURL) {
  const label = text.startsWith('data:') ? '[Media]'
    : /^https:\/\/tmpfiles\.org\//.test(text) ? '📎 ' + text.slice(0, 40) + '…'
    : text.length > 48 ? text.slice(0, 48) + '…' : text

  qrHistory.unshift({ text: label, dataURL, time: new Date().toLocaleTimeString() })
  if (qrHistory.length > 12) qrHistory = qrHistory.slice(0, 12)
  try { localStorage.setItem('qr-history-v2', JSON.stringify(qrHistory)) } catch (_) {}
  renderHistory()
}

function renderHistory() {
  const list = $('history-list')
  if (!qrHistory.length) {
    list.innerHTML = '<p class="text-center text-xs py-3" style="color:var(--color-text-3)">No history yet</p>'
    return
  }
  list.innerHTML = qrHistory.map((item, i) => `
    <div class="history-item" id="hist-${i}">
      <div class="w-8 h-8 rounded-md overflow-hidden flex-shrink-0 bg-white cursor-pointer" onclick="restoreHistory(${i})">
        <img src="${item.dataURL}" alt="QR" class="w-full h-full object-cover">
      </div>
      <div class="flex-1 min-w-0 cursor-pointer" onclick="restoreHistory(${i})">
        <div class="text-xs truncate" style="color:var(--color-text-1);font-family:var(--font-mono)">${escHtml(item.text)}</div>
        <div class="text-xs mt-0.5" style="color:var(--color-text-3)">${item.time}</div>
      </div>
      <button class="history-delete-btn" onclick="deleteHistory(event,${i})" title="Remove">✕</button>
    </div>
  `).join('')
}

window.restoreHistory = (i) => {
  const item = qrHistory[i]
  currentQRDataURL = item.dataURL
  const canvas = $('qr-canvas')
  const img = new Image()
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

window.deleteHistory = (e, i) => {
  e.stopPropagation()
  qrHistory.splice(i, 1)
  try { localStorage.setItem('qr-history-v2', JSON.stringify(qrHistory)) } catch (_) {}
  renderHistory()
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}
