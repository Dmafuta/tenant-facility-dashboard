import { NextRequest, NextResponse } from 'next/server'
import { createWorker } from 'tesseract.js'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json()
    if (!image) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

    const worker = await createWorker('eng')
    await worker.setParameters({
      // Only recognise characters valid in a number plate
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ',
    })

    const buffer = Buffer.from(image, 'base64')
    const { data: { text } } = await worker.recognize(buffer)
    await worker.terminate()

    // Clean: uppercase, strip anything that isn't alphanumeric/space, collapse spaces
    const cleaned = text
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    return NextResponse.json({ text: cleaned })
  } catch {
    return NextResponse.json({ error: 'OCR failed' }, { status: 500 })
  }
}
