import { cva, type VariantProps } from 'class-variance-authority'
import React from 'react'
import { cn } from '@/lib/cn'
import { Spinner } from '@/components/ui/Spinner'

const button = cva(
  'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus-visible:ring-gray-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
        ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-500',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cn(button({ variant, size }), className)}
      {...props}
    >
      {/* Keep the label in place while loading so the button does not resize. */}
      {isLoading && <Spinner className="w-4 h-4" />}
      {children}
    </button>
  ),
)

Button.displayName = 'Button'

export { Button }
