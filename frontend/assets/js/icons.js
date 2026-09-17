// Small hand-drawn SVG mark library — no external images/renders yet, so the
// site uses consistent line-art (chip + QR glyph + NFC arcs) instead of text
// placeholders. Swap for real product photos in assets/img/ when available
// (see catalog.js / product.js — just replace the .card-thumb / .hero-art
// innerHTML with an <img>).

const LOGO_MARK = `
<svg class="logo-mark" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="14" cy="14" r="10" fill="none" stroke="var(--accent)" stroke-width="2"/>
  <circle cx="14" cy="14" r="2.5" fill="var(--accent)"/>
  <path d="M14 0v3M14 25v3M0 14h3M25 14h3" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>
</svg>`;

function qrGlyph(x, y, s) {
  const u = s / 34;
  return `
    <g transform="translate(${x},${y})">
      <rect width="${s}" height="${s}" rx="${3 * u}" fill="none" stroke="var(--accent)" stroke-width="1.5"/>
      <rect x="${5 * u}" y="${5 * u}" width="${8 * u}" height="${8 * u}" fill="var(--accent)"/>
      <rect x="${21 * u}" y="${5 * u}" width="${8 * u}" height="${8 * u}" fill="var(--accent)"/>
      <rect x="${5 * u}" y="${21 * u}" width="${8 * u}" height="${8 * u}" fill="var(--accent)"/>
      <rect x="${21 * u}" y="${21 * u}" width="${4 * u}" height="${4 * u}" fill="var(--accent)"/>
    </g>`;
}

function nfcArcs(cx, cy) {
  return `
    <g stroke="var(--accent)" stroke-width="1.5" fill="none" opacity="0.7">
      <path d="M${cx - 10} ${cy - 6} a 14 14 0 0 1 20 0"/>
      <path d="M${cx - 16} ${cy - 14} a 24 24 0 0 1 32 0"/>
    </g>`;
}

function spinnerBody() {
  return `
    <circle cx="160" cy="160" r="120" fill="none" stroke="var(--border)" stroke-width="1"/>
    <circle cx="160" cy="160" r="96" fill="none" stroke="var(--accent-dim)" stroke-width="2"/>
    <g stroke="var(--accent-dim)" stroke-width="2">
      <line x1="160" y1="160" x2="160" y2="70"/>
      <line x1="160" y1="160" x2="238" y2="205"/>
      <line x1="160" y1="160" x2="82" y2="205"/>
    </g>
    <circle cx="160" cy="70" r="14" fill="var(--bg-panel)" stroke="var(--accent)" stroke-width="2"/>
    <circle cx="238" cy="205" r="14" fill="var(--bg-panel)" stroke="var(--accent)" stroke-width="2"/>
    <circle cx="82" cy="205" r="14" fill="var(--bg-panel)" stroke="var(--accent)" stroke-width="2"/>
    <circle cx="160" cy="160" r="10" fill="var(--accent)"/>`;
}

// Big illustration for the homepage hero and the product page hero-art.
const HERO_ILLUSTRATION = `
<svg viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="width:100%;height:100%;">
  ${spinnerBody()}
  ${qrGlyph(198, 108, 34)}
  ${nfcArcs(100, 100)}
</svg>`;

// Per-product card icon — differentiates the three SKUs at a glance:
// spinner (1 QR), duo (2 QR), keychain tag (no spinner arms, tag silhouette).
function productIcon(productId, size = "sm") {
  const box = size === "lg" ? 320 : 160;
  if (productId === "spinner-chip-duo") {
    return `
      <svg viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="width:${box}px;height:${box}px;max-width:100%;">
        ${spinnerBody()}
        ${qrGlyph(198, 108, 30)}
        ${qrGlyph(92, 182, 30)}
      </svg>`;
  }
  if (productId === "keychain-tag") {
    return `
      <svg viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="width:${box}px;height:${box}px;max-width:100%;">
        <rect x="90" y="60" width="140" height="200" rx="18" fill="none" stroke="var(--accent-dim)" stroke-width="2"/>
        <circle cx="160" cy="92" r="12" fill="none" stroke="var(--accent)" stroke-width="2"/>
        <circle cx="160" cy="92" r="4" fill="var(--accent)"/>
        ${qrGlyph(126, 150, 68)}
      </svg>`;
  }
  return `
    <svg viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="width:${box}px;height:${box}px;max-width:100%;">
      ${spinnerBody()}
      ${qrGlyph(198, 108, 34)}
      ${nfcArcs(100, 100)}
    </svg>`;
}
