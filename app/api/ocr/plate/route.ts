import { NextRequest, NextResponse } from 'next/server'
import { createWorker } from 'tesseract.js'

export const runtime = 'nodejs'

// ── Kenya plate format definitions ────────────────────────────────────────────
// Each entry: regex must match the plate WITH optional internal spaces removed.
const KENYA_FORMATS: { name: string; label: string; pattern: RegExp }[] = [
  // Standard private/commercial — KAA 000A  (current series)
  { name: 'private',      label: 'Private',        pattern: /^K[A-Z]{2}[0-9]{3}[A-Z]$/ },
  // Older private — KAA 000  (no trailing letter)
  { name: 'private_old',  label: 'Private (old)',  pattern: /^K[A-Z]{2}[0-9]{3}$/ },
  // Government red plates — G 001 KEN
  { name: 'government',   label: 'Government',     pattern: /^G[0-9]{3}KEN$/ },
  // Newer government — GK 0001
  { name: 'government2',  label: 'Government',     pattern: /^GK[0-9]{4}$/ },
  // Diplomatic / Consular / Commercial attaché
  { name: 'diplomatic',   label: 'Diplomatic',     pattern: /^(DCD|DCC|CM|CC|CMND|CG|CD)[0-9]{2,4}$/ },
  // Kenya Police
  { name: 'police',       label: 'Police',         pattern: /^KPS?[0-9]{3,4}$/ },
  // Military
  { name: 'military',     label: 'Military',       pattern: /^G[KM][0-9]{4}$/ },
  // Transit / Dealer / Temporary
  { name: 'transit',      label: 'Transit/Dealer', pattern: /^T(RP|RN|DL)[0-9]{3,4}[A-Z]?$/ },
  // County plates (e.g. NRB 001A) — broad catch-all for 2–4 letter prefix
  { name: 'county',       label: 'County',         pattern: /^[A-Z]{2,4}[0-9]{3}[A-Z]?$/ },
]

function detectFormat(plateNoSpaces: string): { name: string; label: string } | null {
  for (const fmt of KENYA_FORMATS) {
    if (fmt.pattern.test(plateNoSpaces)) return { name: fmt.name, label: fmt.label }
  }
  return null
}

// ── Plate candidate extraction ─────────────────────────────────────────────────
// Tesseract may return multiple words/lines. Walk through and find the longest
// substring that matches a known Kenya plate pattern.
function extractPlateCandidate(rawText: string): string {
  const text = rawText.toUpperCase().replace(/[^A-Z0-9\s]/g, '').replace(/\s+/g, ' ').trim()

  // Ordered from most-specific to least-specific so we pick the best match first
  const searches: RegExp[] = [
    /K[A-Z]{2}\s?[0-9]{3}[A-Z]/,          // KAA 000A
    /K[A-Z]{2}\s?[0-9]{3}(?![A-Z\d])/,    // KAA 000
    /G\s?[0-9]{3}\s?KEN/,                  // G 001 KEN
    /GK\s?[0-9]{4}/,                       // GK 0001
    /(DCD|DCC|CM|CC|CMND|CG|CD)\s?[0-9]{2,4}/, // Diplomatic
    /KPS?\s?[0-9]{3,4}/,                   // Police
    /G[KM]\s?[0-9]{4}/,                    // Military
    /T(RP|RN|DL)\s?[0-9]{3,4}[A-Z]?/,     // Transit
  ]

  for (const re of searches) {
    const m = text.match(re)
    if (m) {
      // Normalise spacing: letters then space then digits+letter
      const raw = m[0].replace(/\s/g, '')
      // Insert canonical space for private plates: 3 letters | 3 digits + optional letter
      const canonical = raw.replace(/^(K[A-Z]{2})([0-9]{3}[A-Z]?)$/, '$1 $2')
                           .replace(/^(G)([0-9]{3})(KEN)$/, '$1 $2 $3')
      return canonical
    }
  }

  // No known pattern found — return the cleaned text as-is (guard can type-correct)
  return text
}

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json()
    if (!image) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

    const worker = await createWorker('eng')
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ',
    })

    const buffer = Buffer.from(image, 'base64')
    const { data: { text } } = await worker.recognize(buffer)
    await worker.terminate()

    const plate = extractPlateCandidate(text)
    if (!plate) return NextResponse.json({ text: null })

    const fmt = detectFormat(plate.replace(/\s/g, ''))
    return NextResponse.json({
      text:         plate,
      format:       fmt?.name  ?? 'unknown',
      format_label: fmt?.label ?? 'Unknown',
      valid:        fmt !== null,
    })
  } catch {
    return NextResponse.json({ error: 'OCR failed' }, { status: 500 })
  }
}
