import { cn } from '@/lib/cn'
import { ButtonHTMLAttributes, forwardRef } from 'react'

const variants = {
  primary:  'bg-primary-600 hover:bg-primary-700 text-white shadow-sm',
  secondary:'bg-surface border border-border hover:bg-surface-hover text-text',
  danger:   'bg-danger hover:bg-red-600 text-white',
  ghost:    'hover:bg-surface-hover text-text',
  outline:  'border border-border hover:bg-surface-hover text-text',
}
const sizes = {
  xs: 'h-6 px-2 text-xs',
  sm: 'h-8 px-3 text-sm',
  md: 'h-9 px-4 text-sm',
  lg: 'h-11 px-6 text-base',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', loading, children, className, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center gap-2 font-medium rounded transition-all duration-150 cursor-pointer',
        'active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        variants[variant], sizes[size], className
      )}
      {...props}
    >
      {loading && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  )
)
Button.displayName = 'Button'
