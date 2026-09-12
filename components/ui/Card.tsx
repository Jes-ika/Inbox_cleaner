import React from 'react'
import { cn } from '@/lib/cn'

type DivProps = React.HTMLAttributes<HTMLDivElement>

const Card = React.forwardRef<HTMLDivElement, DivProps>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('rounded-lg border border-gray-200 bg-white shadow-sm', className)}
    {...props}
  />
))
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, DivProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('border-b border-gray-200 px-6 py-4', className)} {...props} />
))
CardHeader.displayName = 'CardHeader'

const CardContent = React.forwardRef<HTMLDivElement, DivProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('px-6 py-4', className)} {...props} />
))
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, DivProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('border-t border-gray-200 px-6 py-4', className)} {...props} />
))
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardContent, CardFooter }
