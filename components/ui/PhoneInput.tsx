'use client'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/cn'

// ── Country list ────────────────────────────────────────────────────────────
export const COUNTRIES = [
  // East Africa
  { code: 'KE', name: 'Kenya',           dial: '+254', flag: '🇰🇪' },
  { code: 'TZ', name: 'Tanzania',        dial: '+255', flag: '🇹🇿' },
  { code: 'UG', name: 'Uganda',          dial: '+256', flag: '🇺🇬' },
  { code: 'RW', name: 'Rwanda',          dial: '+250', flag: '🇷🇼' },
  { code: 'ET', name: 'Ethiopia',        dial: '+251', flag: '🇪🇹' },
  { code: 'SS', name: 'South Sudan',     dial: '+211', flag: '🇸🇸' },
  { code: 'SO', name: 'Somalia',         dial: '+252', flag: '🇸🇴' },
  { code: 'BI', name: 'Burundi',         dial: '+257', flag: '🇧🇮' },
  // Rest of Africa
  { code: 'NG', name: 'Nigeria',         dial: '+234', flag: '🇳🇬' },
  { code: 'ZA', name: 'South Africa',    dial: '+27',  flag: '🇿🇦' },
  { code: 'EG', name: 'Egypt',           dial: '+20',  flag: '🇪🇬' },
  { code: 'GH', name: 'Ghana',           dial: '+233', flag: '🇬🇭' },
  { code: 'ZM', name: 'Zambia',          dial: '+260', flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbabwe',        dial: '+263', flag: '🇿🇼' },
  { code: 'CD', name: 'DR Congo',        dial: '+243', flag: '🇨🇩' },
  { code: 'MZ', name: 'Mozambique',      dial: '+258', flag: '🇲🇿' },
  { code: 'MG', name: 'Madagascar',      dial: '+261', flag: '🇲🇬' },
  { code: 'MA', name: 'Morocco',         dial: '+212', flag: '🇲🇦' },
  { code: 'SD', name: 'Sudan',           dial: '+249', flag: '🇸🇩' },
  { code: 'CM', name: 'Cameroon',        dial: '+237', flag: '🇨🇲' },
  { code: 'CI', name: "Côte d'Ivoire",   dial: '+225', flag: '🇨🇮' },
  { code: 'SN', name: 'Senegal',         dial: '+221', flag: '🇸🇳' },
  { code: 'ML', name: 'Mali',            dial: '+223', flag: '🇲🇱' },
  { code: 'AO', name: 'Angola',          dial: '+244', flag: '🇦🇴' },
  { code: 'NA', name: 'Namibia',         dial: '+264', flag: '🇳🇦' },
  { code: 'BW', name: 'Botswana',        dial: '+267', flag: '🇧🇼' },
  // Europe
  { code: 'GB', name: 'United Kingdom',  dial: '+44',  flag: '🇬🇧' },
  { code: 'DE', name: 'Germany',         dial: '+49',  flag: '🇩🇪' },
  { code: 'FR', name: 'France',          dial: '+33',  flag: '🇫🇷' },
  { code: 'IT', name: 'Italy',           dial: '+39',  flag: '🇮🇹' },
  { code: 'NL', name: 'Netherlands',     dial: '+31',  flag: '🇳🇱' },
  { code: 'ES', name: 'Spain',           dial: '+34',  flag: '🇪🇸' },
  { code: 'CH', name: 'Switzerland',     dial: '+41',  flag: '🇨🇭' },
  // Middle East
  { code: 'AE', name: 'UAE',             dial: '+971', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia',    dial: '+966', flag: '🇸🇦' },
  { code: 'QA', name: 'Qatar',           dial: '+974', flag: '🇶🇦' },
  { code: 'KW', name: 'Kuwait',          dial: '+965', flag: '🇰🇼' },
  // Asia
  { code: 'IN', name: 'India',           dial: '+91',  flag: '🇮🇳' },
  { code: 'CN', name: 'China',           dial: '+86',  flag: '🇨🇳' },
  { code: 'JP', name: 'Japan',           dial: '+81',  flag: '🇯🇵' },
  // Americas
  { code: 'US', name: 'United States',   dial: '+1',   flag: '🇺🇸' },
  { code: 'CA', name: 'Canada',          dial: '+1',   flag: '🇨🇦' },
  { code: 'BR', name: 'Brazil',          dial: '+55',  flag: '🇧🇷' },
  // Oceania
  { code: 'AU', name: 'Australia',       dial: '+61',  flag: '🇦🇺' },
] as const

type Country = typeof COUNTRIES[number]

// Resolve initial country from a full phone string
function detectCountry(value: string): Country {
  if (!value) return COUNTRIES[0]
  // Sort by dial length desc so +254 matches before +25
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length)
  return sorted.find(c => value.startsWith(c.dial)) ?? COUNTRIES[0]
}

function detectLocal(value: string, country: Country): string {
  if (!value) return ''
  return value.startsWith(country.dial) ? value.slice(country.dial.length) : value
}

// ── PhoneInput ──────────────────────────────────────────────────────────────
interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function PhoneInput({ value, onChange, placeholder = '712 345 678', disabled, className }: PhoneInputProps) {
  const [country, setCountry] = useState<Country>(() => detectCountry(value))
  const [local, setLocal]     = useState(() => detectLocal(value, detectCountry(value)))
  const [open, setOpen]       = useState(false)
  const [search, setSearch]   = useState('')
  const dropdownRef           = useRef<HTMLDivElement>(null)
  const searchRef             = useRef<HTMLInputElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Focus search when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
  }, [open])

  const selectCountry = (c: Country) => {
    setCountry(c)
    setOpen(false)
    setSearch('')
    onChange(c.dial + local)
  }

  const handleLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow digits, spaces, hyphens, parens — backend normalizes
    const val = e.target.value.replace(/[^\d\s\-()]/g, '')
    setLocal(val)
    onChange(country.dial + val)
  }

  const filtered = search
    ? COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.dial.includes(search)
      )
    : COUNTRIES

  const base = 'border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text focus:outline-none'

  return (
    <div className={cn('flex rounded-lg overflow-visible', className)} ref={dropdownRef}>
      {/* Country selector button */}
      <div className="relative shrink-0">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(o => !o)}
          className={cn(
            base,
            'flex items-center gap-1.5 px-2.5 py-2.5 rounded-l-lg border-r-0',
            'focus:ring-2 focus:ring-primary-500 focus:z-10',
            'hover:bg-surface-hover dark:hover:bg-dark-hover transition-colors',
            'whitespace-nowrap text-xs font-medium',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span className="text-base leading-none">{country.flag}</span>
          <span className="text-text-muted">{country.dial}</span>
          <svg className="w-3 h-3 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute left-0 top-full mt-1 z-50 w-64 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card shadow-lg overflow-hidden">
            {/* Search */}
            <div className="p-2 border-b border-surface-border dark:border-dark-border">
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search country or code…"
                className="w-full px-2.5 py-1.5 text-xs rounded-md border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            {/* List */}
            <ul className="max-h-52 overflow-y-auto">
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-xs text-text-muted">No results</li>
              )}
              {filtered.map(c => (
                <li key={c.code}>
                  <button
                    type="button"
                    onClick={() => selectCountry(c)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left',
                      'hover:bg-surface-hover dark:hover:bg-dark-hover transition-colors',
                      c.code === country.code && 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
                    )}
                  >
                    <span className="text-base leading-none">{c.flag}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-text-muted shrink-0">{c.dial}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Local number input */}
      <input
        type="tel"
        value={local}
        onChange={handleLocal}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          base,
          'flex-1 min-w-0 px-3 py-2.5 rounded-r-lg',
          'focus:ring-2 focus:ring-primary-500 focus:z-10',
          'placeholder:text-text-muted/60',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      />
    </div>
  )
}
