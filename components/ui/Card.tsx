import { cn } from '@/lib/cn'
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bg-white dark:bg-dark-card border border-surface-border dark:border-dark-border rounded-lg shadow-card transition-shadow hover:shadow-card-hover', className)}
      {...props}
    >{children}</div>
  )
}
