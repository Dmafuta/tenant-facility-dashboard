'use client'
import { cn } from '@/lib/cn'

interface SelectOption { value: string; label: string }

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  className?: string
}

export function Select({ value, onChange, options, className }: SelectProps) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={cn('h-9 px-3 text-sm bg-surface dark:bg-dark-surface border border-surface-border dark:border-dark-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer', className)}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
