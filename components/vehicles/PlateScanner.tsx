'use client'
import { useEffect, useRef, useState } from 'react'

export function PlateScanner({ onResult, onClose }: {
  onResult: (text: string) => void
  onClose: () => void
}) {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [ready,    setReady]    = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then(stream => {
        streamRef.current = stream
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
        setReady(true)
      })
      .catch(() => setError('Camera access denied. Please allow camera permissions and try again.'))
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  async function capture() {
    if (!videoRef.current || !canvasRef.current || scanning || !ready) return
    setScanning(true)
    setError(null)
    const video  = videoRef.current
    const canvas = canvasRef.current
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    const base64 = canvas.toDataURL('image/jpeg', 0.92).split(',')[1]
    try {
      const res  = await fetch('/api/ocr/plate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      })
      const data = await res.json()
      if (data.text) { onResult(data.text) }
      else { setError('Could not read plate — try again.'); setScanning(false) }
    } catch {
      setError('OCR request failed — try again.')
      setScanning(false)
    }
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
        <p className="text-sm font-medium text-white">Point camera at number plate</p>
      </div>

      {/* Viewfinder */}
      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="flex items-center justify-center h-full px-8 text-center text-sm text-white/70">{error}</div>
        ) : (
          <>
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="w-4/5 h-16 rounded-lg border-2 border-white"
                style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)' }}
              />
            </div>
            <p className="absolute bottom-4 left-0 right-0 text-center text-xs text-white/60">
              Align plate inside the guide then tap Capture
            </p>
          </>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Capture button */}
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
    </div>
  )
}
