import { FC, ReactNode, HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  className?: string
}

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export const Card: FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div className={`border rounded-lg p-4 ${className}`} {...props}>
      {children}
    </div>
  )
}

export const CardContent: FC<CardContentProps> = ({ children, ...props }) => {
  return (
    <div className="p-2" {...props}>
      {children}
    </div>
  )
}
