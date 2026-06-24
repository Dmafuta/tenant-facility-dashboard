'use client'
import { useEffect, useRef, useState } from 'react'
import type { VehicleData } from '@/lib/api/vehicles'

type FrameMode = 'standard' | 'motorcycle' | 'special'
type ScanResult = { text: string; format: string; format_label: string; valid: boolean }

// Frame guide dimensions for each plate type
const FRAMES: Record<FrameMode, { label: string; hint: string; w: string; h: string }> = {
  standard:   { label: 'Standard',   hint: 'Private / Commercial (e.g. KAA 000A)', w: '80%', h: '64px'  },
  motorcycle: { label: 'Motorcycle', hint: 'Motorcycle plates — squarer format',   w: '60%', h: '90px'  },
  special:    { label: 'Special',    hint: 'G-plates / Diplomatic / County',        w: '80%', h: '80px'  },
}
const FRAME_CYCLE: FrameMode[] = ['standard', 'motorcycle', 'special']

export function PlateScanner({ onResult, onClose, vehicles }: {
  onResult: (text: string) => void
  onClose: () => void
  vehicles?: VehicleData[]
}) {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const guideRef  = useRef<HTMLDivElement>(null)

  const [ready,      setReady]      = useState(false)
  const [scanning,   setScanning]   = useState(false)
  const [camError,   setCamError]   = useState<string | null>(null)
  const [frameMode,  setFrameMode]  = useState<FrameMode>('standard')
  const [result,     setResult]     = useState<ScanResult | null>(null)
  const [ocrError,   setOcrError]   = useState<string | null>(null)
  const [matched,    setMatched]    = useState<VehicleData | null | undefined>(undefined)

  const frame = FRAMES[frameMode]

  // Start camera
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then(stream => {
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          video.onloadedmetadata = () => setReady(true)
          video.play()
        }
      })
      .catch(() => setCamError('Camera access denied. Please allow camera permissions and try again.'))
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  // Cross-check scanned plate against registered vehicles
  useEffect(() => {
    if (!result || !vehicles) { setMatched(undefined); return }
    const normalized = result.text.replace(/\s/g, '').toUpperCase()
    setMatched(vehicles.find(v => v.plate_number.replace(/\s/g, '').toUpperCase() === normalized) ?? null)
  }, [result, vehicles])

  async function capture() {
    if (!videoRef.current || !canvasRef.current || scanning || !ready) return
    setScanning(true)
    setOcrError(null)
    setResult(null)
    setMatched(undefined)

    const video  = videoRef.current
    const canvas = canvasRef.current

    // Draw full frame onto the hidden canvas at native resolution
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)

    // Crop to the guide frame region so OCR only sees the plate area
    let base64: string
    const guide = guideRef.current
    if (guide && video.videoWidth > 0) {
      const vRect = video.getBoundingClientRect()
      const gRect = guide.getBoundingClientRect()

      // video uses object-cover: the rendered video fills vRect while the
      // native video stream may have a different aspect ratio.
      const scaleX = video.videoWidth  / vRect.width
      const scaleY = video.videoHeight / vRect.height

      const sx = Math.round((gRect.left - vRect.left) * scaleX)
      const sy = Math.round((gRect.top  - vRect.top)  * scaleY)
      const sw = Math.round(gRect.width  * scaleX)
      const sh = Math.round(gRect.height * scaleY)

      const crop = document.createElement('canvas')
      crop.width  = sw
      crop.height = sh
      crop.getContext('2d')!.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh)
      base64 = crop.toDataURL('image/jpeg', 0.92).split(',')[1]
    } else {
      base64 = canvas.toDataURL('image/jpeg', 0.92).split(',')[1]
    }

    try {
      const res  = await fetch('/api/ocr/plate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      })
      const data = await res.json()
      if (data.text) {
        setResult(data as ScanResult)
      } else {
        setOcrError('Could not read plate — reposition and try again.')
      }
    } catch {
      setOcrError('OCR request failed — try again.')
    } finally {
      setScanning(false)
    }
  }

  function cycleMode() {
    const next = FRAME_CYCLE[(FRAME_CYCLE.indexOf(frameMode) + 1) % FRAME_CYCLE.length]
    setFrameMode(next)
    setResult(null)
    setOcrError(null)
    setMatched(undefined)
  }

  function retake() {
    setResult(null)
    setOcrError(null)
    setMatched(undefined)
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-black/60 flex-shrink-0">
        <button onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:text-white">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">Scan Number Plate</p>
          <p className="text-xs text-white/50 truncate">{frame.hint}</p>
        </div>
        {/* Frame mode toggle */}
        <button
          onClick={cycleMode}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          {frame.label} ↻
        </button>
      </div>

      {/* Viewfinder */}
      <div className="flex-1 relative overflow-hidden">
        {camError ? (
          <div className="flex items-center justify-center h-full px-8 text-center">
            <p className="text-sm text-white/70">{camError}</p>
          </div>
        ) : (
          <>
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />

            {/* Guide frame — only shown before scan */}
            {!result && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Corner markers */}
                <div
                  ref={guideRef}
                  className="rounded-lg border-2 border-white relative"
                  style={{ width: frame.w, height: frame.h, boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)' }}
                >
                  {/* Corner accents */}
                  {['top-0 left-0','top-0 right-0','bottom-0 left-0','bottom-0 right-0'].map((pos, i) => (
                    <span key={i} className={`absolute ${pos} w-4 h-4 border-white
                      ${i < 2 ? 'border-t-2' : 'border-b-2'}
                      ${i % 2 === 0 ? 'border-l-2' : 'border-r-2'}
                      ${i === 0 ? '-translate-x-[1px] -translate-y-[1px]' :
                        i === 1 ? 'translate-x-[1px] -translate-y-[1px]' :
                        i === 2 ? '-translate-x-[1px] translate-y-[1px]' :
                                  'translate-x-[1px] translate-y-[1px]'}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* OCR error */}
            {ocrError && !result && (
              <div className="absolute bottom-20 left-0 right-0 flex justify-center px-6">
                <p className="text-xs text-red-300 bg-red-900/60 rounded-lg px-4 py-2 text-center">{ocrError}</p>
              </div>
            )}

            {/* Result overlay */}
            {result && (
              <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-4 p-6 overflow-y-auto">

                {/* Plate display */}
                <div className="bg-amber-300 rounded-lg px-8 py-3 text-center shadow-2xl">
                  <p className="text-3xl font-bold font-mono tracking-[0.15em] text-black">{result.text}</p>
                </div>

                {/* Format validity */}
                {result.valid ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/20 border border-green-400/40 text-green-300 text-xs font-medium">
                    ✓ Valid Kenya {result.format_label} plate
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-medium">
                    ⚠ Format unrecognised — verify manually
                  </span>
                )}

                {/* Registry cross-check */}
                {vehicles && (
                  <div className={`w-full max-w-sm rounded-xl p-4 text-sm ${
                    matched === undefined
                      ? 'bg-white/5 text-white/50'
                      : matched
                        ? 'bg-green-500/15 border border-green-400/30'
                        : 'bg-red-500/15 border border-red-400/30'
                  }`}>
                    {matched === undefined ? (
                      <p className="text-center text-xs text-white/40">Checking registry…</p>
                    ) : matched ? (
                      <div className="space-y-1">
                        <p className="text-green-300 font-semibold text-xs">✓ Registered in system</p>
                        <p className="text-white font-medium text-sm">
                          {matched.person_name ?? '—'} · {matched.unit_label ?? '—'}
                        </p>
                        <p className="text-white/60 text-xs capitalize">
                          {[matched.color, matched.make, matched.model, matched.year?.toString()].filter(Boolean).join(' ')}
                          {matched.vehicle_type !== 'car' ? ` · ${matched.vehicle_type}` : ''}
                        </p>
                        <p className="text-white/40 text-xs pt-1 border-t border-white/10">
                          Visually confirm the vehicle color and make match before granting access.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-red-300 font-semibold text-xs">⚠ Not in vehicle registry</p>
                        <p className="text-white/60 text-xs">
                          This plate is not registered in your system. Do not grant access without management approval.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={retake}
                    className="px-5 py-2 rounded-xl text-sm bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    Retake
                  </button>
                  <button
                    onClick={() => onResult(result.text)}
                    className="px-6 py-2 rounded-xl text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
                  >
                    Use This Plate
                  </button>
                </div>
              </div>
            )}

            {!result && (
              <p className="absolute bottom-4 left-0 right-0 text-center text-xs text-white/50">
                Align plate inside the guide then tap Capture
              </p>
            )}
          </>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Capture button */}
      {!result && (
        <div className="flex justify-center items-center py-6 bg-black flex-shrink-0">
          <button
            onClick={capture}
            disabled={!ready || scanning}
            className="w-16 h-16 rounded-full border-4 border-white bg-white/20 flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
          >
            {scanning
              ? <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <span className="w-10 h-10 rounded-full bg-white" />}
          </button>
        </div>
      )}
    </div>
  )
}
