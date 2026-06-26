'use client'
import { useEffect } from 'react'

export default function PrintTrigger() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      <button
        className="btn-print"
        style={{ padding: '7px 16px', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: '#1e3a5f', color: '#fff' }}
        onClick={() => window.print()}
      >
        Print / Save PDF
      </button>
      <button
        className="btn-close"
        style={{ padding: '7px 16px', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: '#eee', color: '#333' }}
        onClick={() => window.close()}
      >
        Close
      </button>
    </>
  )
}
