import type { HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-card border border-line bg-paper shadow-card', className)} {...props} />
}
