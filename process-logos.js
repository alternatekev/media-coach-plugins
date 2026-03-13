#!/usr/bin/env node
/**
 * process-logos.js
 *
 * Reads SVG logo files from brand-svgs/, normalizes them for the dashboard's
 * 80×80 viewport, adds a subtle brand-color outline (30% opacity drop-shadow),
 * and outputs the updated carLogos JavaScript object.
 *
 * Usage: node process-logos.js > carLogos-output.js
 *
 * For brands without an SVG file in brand-svgs/, keeps the current geometric
 * placeholder and applies the outline filter.
 */

const fs = require('fs');
const path = require('path');

const SVG_DIR = path.join(__dirname, 'brand-svgs');
const DASH_FILE = path.join(__dirname, 'simhub-plugin/K10 Media Broadcast/dashboard.html');

// Brand color definitions (hex) — used for drop-shadow outline
const BRAND_COLORS = {
  bmw:          { hex: '#0066B1', rgb: '0,102,177' },
  mclaren:      { hex: '#FF8000', rgb: '255,128,0' },
  mazda:        { hex: '#E10027', rgb: '225,0,39' },
  nissan:       { hex: '#C3002F', rgb: '195,0,47' },
  dallara:      { hex: '#CC0000', rgb: '204,0,0' },
  ferrari:      { hex: '#D40000', rgb: '212,0,0' },
  porsche:      { hex: '#B12B28', rgb: '177,43,40' },
  audi:         { hex: '#C0C0C0', rgb: '192,192,192' },
  mercedes:     { hex: '#00D2BE', rgb: '0,210,190' },
  lamborghini:  { hex: '#B6A272', rgb: '182,162,114' },
  chevrolet:    { hex: '#CD9834', rgb: '205,152,52' },
  ford:         { hex: '#003478', rgb: '0,52,120' },
  toyota:       { hex: '#EB0A1E', rgb: '235,10,30' },
  hyundai:      { hex: '#4E8CC9', rgb: '78,140,201' },
  cadillac:     { hex: '#B5985A', rgb: '181,152,90' },
  astonmartin:  { hex: '#00665E', rgb: '0,102,94' },
  lotus:        { hex: '#FFF200', rgb: '255,242,0' },
  honda:        { hex: '#E40521', rgb: '228,5,33' },
};

// Parse viewBox from SVG string
function parseViewBox(svg) {
  const m = svg.match(/viewBox\s*=\s*"([^"]+)"/);
  if (!m) return null;
  const parts = m[1].trim().split(/[\s,]+/).map(Number);
  if (parts.length === 4) return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
  return null;
}

// Extract just the inner content of the SVG (everything between <svg...> and </svg>)
function extractSvgInner(svg) {
  const openMatch = svg.match(/<svg[^>]*>/);
  if (!openMatch) return svg;
  const startIdx = openMatch.index + openMatch[0].length;
  const endIdx = svg.lastIndexOf('</svg>');
  if (endIdx === -1) return svg.substring(startIdx);
  return svg.substring(startIdx, endIdx);
}

// Extract attributes from the SVG tag
function extractSvgAttrs(svg) {
  const m = svg.match(/<svg([^>]*)>/);
  if (!m) return {};
  const attrs = {};
  const attrRegex = /(\w[\w-]*)\s*=\s*"([^"]*)"/g;
  let match;
  while ((match = attrRegex.exec(m[1]))) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

// Normalize an SVG for 80×80 dashboard display
// Centers the content within an 80×80 viewBox, preserving aspect ratio
function normalizeSvg(rawSvg, brand) {
  const color = BRAND_COLORS[brand];
  if (!color) return rawSvg;

  // Clean up the SVG
  let svg = rawSvg.trim();

  // Remove XML declarations and comments
  svg = svg.replace(/<\?xml[^?]*\?>/g, '');
  svg = svg.replace(/<!--[\s\S]*?-->/g, '');
  svg = svg.replace(/<desc>[^<]*<\/desc>/g, '');
  svg = svg.replace(/<title>[^<]*<\/title>/g, '');

  const vb = parseViewBox(svg);
  const inner = extractSvgInner(svg);
  const attrs = extractSvgAttrs(svg);

  if (!vb) {
    // No viewBox — try width/height
    const w = parseFloat(attrs.width) || 80;
    const h = parseFloat(attrs.height) || 80;
    vb = { x: 0, y: 0, w, h };
  }

  // Calculate transform to center within 80×80
  const pad = 4; // padding on each side
  const available = 80 - pad * 2; // 72
  const scaleX = available / vb.w;
  const scaleY = available / vb.h;
  const scale = Math.min(scaleX, scaleY);
  const scaledW = vb.w * scale;
  const scaledH = vb.h * scale;
  const offsetX = pad + (available - scaledW) / 2;
  const offsetY = pad + (available - scaledH) / 2;

  // Build the drop-shadow filter for brand-color outline
  const filterStyle = `filter: drop-shadow(0 0 1.5px rgba(${color.rgb},0.3)) drop-shadow(0 0 3px rgba(${color.rgb},0.15))`;

  // Check if inner content has any visible fill (not just "none" or missing)
  // If no fill found, add fill="white" to make it visible on dark backgrounds
  let innerContent = inner.replace(/\s+/g, ' ').trim();
  const hasFill = /fill\s*[:=]\s*["']?(?!none|transparent)[^"';\s]+/.test(innerContent);
  if (!hasFill) {
    // Wrap in a group with white fill so paths without explicit fill are visible
    innerContent = `<g fill="#FFFFFF">${innerContent}</g>`;
  }

  // Construct normalized SVG
  // NOTE: Do NOT use transform-origin on <g> — it can cause rendering issues
  // in Electron transparent windows. SVG transforms naturally use (0,0) origin.
  const result = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" style="${filterStyle}">` +
    `<g transform="translate(${offsetX.toFixed(2)},${offsetY.toFixed(2)}) scale(${scale.toFixed(4)})">` +
    `<g transform="translate(${-vb.x},${-vb.y})">` +
    innerContent +
    `</g></g></svg>`;

  return result;
}

// Read SVG files from brand-svgs directory
function readBrandSvg(brand) {
  const filePath = path.join(SVG_DIR, `${brand}.svg`);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8');
  }
  return null;
}

// Fallback: add outline filter to existing geometric placeholder
function addOutlineToPlaceholder(svgStr, brand) {
  const color = BRAND_COLORS[brand];
  if (!color) return svgStr;

  const filterStyle = `filter: drop-shadow(0 0 1.5px rgba(${color.rgb},0.3)) drop-shadow(0 0 3px rgba(${color.rgb},0.15))`;

  // Insert style attribute into existing SVG tag
  return svgStr.replace(/<svg\s/, `<svg style="${filterStyle}" `);
}

// Main
const brands = [
  'bmw', 'mclaren', 'mazda', 'nissan', 'dallara', 'ferrari',
  'porsche', 'audi', 'mercedes', 'lamborghini', 'chevrolet',
  'ford', 'toyota', 'hyundai', 'cadillac', 'astonmartin',
  'lotus', 'honda'
];

// Read existing dashboard to extract current placeholder SVGs
let dashContent = '';
try {
  dashContent = fs.readFileSync(DASH_FILE, 'utf-8');
} catch(e) {
  console.error('Warning: Could not read dashboard.html:', e.message);
}

// Extract current carLogos from dashboard
function extractCurrentLogo(brand) {
  const regex = new RegExp(`${brand}:\\s*\`([\\s\\S]*?)\``, 'm');
  const m = dashContent.match(regex);
  return m ? m[1].trim() : null;
}

console.log('// ═══ PROCESSED CAR LOGOS ═══');
console.log('// Generated by process-logos.js');
console.log('// Brands with real SVGs: ' + brands.filter(b => readBrandSvg(b)).join(', '));
console.log('// Brands using placeholders: ' + brands.filter(b => !readBrandSvg(b)).join(', '));
console.log('');
console.log('const carLogos = {');

for (const brand of brands) {
  const rawSvg = readBrandSvg(brand);
  let processed;

  if (rawSvg) {
    processed = normalizeSvg(rawSvg, brand);
    console.log(`  // ── ${brand.toUpperCase()} — REAL LOGO ──`);
  } else {
    // Use current placeholder with outline added
    const placeholder = extractCurrentLogo(brand);
    if (placeholder) {
      processed = addOutlineToPlaceholder(placeholder, brand);
      console.log(`  // ── ${brand.toUpperCase()} — placeholder (needs real SVG) ──`);
    } else {
      processed = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><text x="40" y="44" text-anchor="middle" fill="rgba(255,255,255,0.3)" font-size="8">${brand}</text></svg>`;
      console.log(`  // ── ${brand.toUpperCase()} — missing ──`);
    }
  }

  // Escape backticks in the SVG
  const escaped = processed.replace(/`/g, '\\`');
  console.log(`  ${brand}: \`${escaped}\`,`);
}

// Generic + none
console.log('  generic: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="30" fill="none" stroke="hsla(0,0%,100%,0.3)" stroke-width="4"/><circle cx="40" cy="40" r="22" fill="none" stroke="hsla(0,0%,100%,0.15)" stroke-width="2"/><circle cx="40" cy="40" r="5" fill="hsla(0,0%,100%,0.3)"/><line x1="40" y1="10" x2="40" y2="18" stroke="hsla(0,0%,100%,0.3)" stroke-width="3" stroke-linecap="round"/><line x1="40" y1="62" x2="40" y2="70" stroke="hsla(0,0%,100%,0.3)" stroke-width="3" stroke-linecap="round"/><line x1="10" y1="40" x2="18" y2="40" stroke="hsla(0,0%,100%,0.3)" stroke-width="3" stroke-linecap="round"/><line x1="62" y1="40" x2="70" y2="40" stroke="hsla(0,0%,100%,0.3)" stroke-width="3" stroke-linecap="round"/></svg>`,');
console.log('  none: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><text x="40" y="44" text-anchor="middle" fill="hsla(0,0%,100%,0.15)" font-family="Corbel,sans-serif" font-size="10" font-weight="600">NO CAR</text></svg>`');
console.log('};');

// Summary
console.error('\n═══ SUMMARY ═══');
const realCount = brands.filter(b => readBrandSvg(b)).length;
console.error(`Real logos: ${realCount}/${brands.length}`);
console.error(`Placeholders: ${brands.length - realCount}/${brands.length}`);
brands.filter(b => !readBrandSvg(b)).forEach(b => console.error(`  Missing: ${b}`));
