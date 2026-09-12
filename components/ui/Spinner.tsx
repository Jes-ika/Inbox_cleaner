import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

interface SpinnerProps {
  className?: string
  label?: string
}

export function Spinner({ className, label }: SpinnerProps) {
  return (
    <>
      <Loader2
        aria-hidden="true"
        className={cn('animate-spin motion-reduce:animate-none', className)}
      />
      {label ? <span className="sr-only">{label}</span> : null}
    </>
  )
}
