import { cn } from '@/lib/cn'
const variants = {
  default:  'bg-surface-hover text-text-muted',
  primary:  'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
  success:  'bg-success/10 text-success',
  warning:  'bg-warning/10 text-warning',
  danger:   'bg-danger/10 text-danger',
  purple:   'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  blue:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  orange:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
}
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants
}
export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', variants[variant], className)} {...props}>
      {children}
    </span>
  )
}
