export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface dark:bg-dark-surface">
      {children}
    </div>
  )
}
