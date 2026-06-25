'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { getBrandConfig, type BrandConfig } from '@/lib/api/settings'

// ── Legal modal ───────────────────────────────────────────────────────────────
function LegalModal({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-surface dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">{title}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text text-lg leading-none">✕</button>
        </div>
        <p className="text-sm text-text-muted leading-relaxed">
          This document is being prepared and will be available soon.
          For any enquiries, please contact{' '}
          <a href="mailto:legal@quantumconnect.io" className="text-primary-600 hover:underline">
            legal@quantumconnect.io
          </a>.
        </p>
        <button
          onClick={onClose}
          className="w-full py-2 rounded-lg bg-surface-muted dark:bg-dark-hover border border-surface-border dark:border-dark-border text-sm text-text-muted hover:text-text transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}

// ── Bottom bar ────────────────────────────────────────────────────────────────
export function BottomBar() {
  const [brand, setBrand]   = useState<BrandConfig | null>(null)
  const [modal, setModal]   = useState<'terms' | 'privacy' | null>(null)
  const year = new Date().getFullYear()

  useEffect(() => {
    getBrandConfig().then(setBrand)
  }, [])

  const name    = brand?.name    ?? 'QuantumConnect'
  const logoUrl = brand?.logo_url ?? ''

  return (
    <>
      <div className="shrink-0 w-full border-t border-surface-border dark:border-dark-border bg-surface dark:bg-dark-surface px-4 h-8 flex items-center justify-between gap-4">

        {/* Left — legal links */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setModal('terms')}
            className="text-[11px] text-text-muted hover:text-text transition-colors"
          >
            Terms of Service
          </button>
          <span className="text-[11px] text-text-muted/40">·</span>
          <button
            onClick={() => setModal('privacy')}
            className="text-[11px] text-text-muted hover:text-text transition-colors"
          >
            Privacy Policy
          </button>
        </div>

        {/* Right — brand */}
        <div className="flex items-center gap-1.5">
          {logoUrl ? (
            <Image src={logoUrl} alt={name} width={14} height={14} className="opacity-60" />
          ) : (
            <Image src="/qc-icon.png" alt="QuantumConnect" width={14} height={14} className="opacity-60" unoptimized />
          )}
          <span className="text-[11px] text-text-muted">
            © {year} {name}. All rights reserved.
          </span>
        </div>

      </div>

      {modal === 'terms'   && <LegalModal title="Terms of Service" onClose={() => setModal(null)} />}
      {modal === 'privacy' && <LegalModal title="Privacy Policy"   onClose={() => setModal(null)} />}
    </>
  )
}
