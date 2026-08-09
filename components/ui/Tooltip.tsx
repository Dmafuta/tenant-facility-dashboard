'use client'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'

interface TooltipProps {
  content: string
  children: React.ReactElement
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  function show() {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const GAP = 6
    let top = 0, left = 0
    if (side === 'top') {
      top = rect.top - GAP
      left = rect.left + rect.width / 2
    } else if (side === 'bottom') {
      top = rect.bottom + GAP
      left = rect.left + rect.width / 2
    } else if (side === 'left') {
      top = rect.top + rect.height / 2
      left = rect.left - GAP
    } else {
      top = rect.top + rect.height / 2
      left = rect.right + GAP
    }
    setCoords({ top, left })
    setVisible(true)
  }

  const transformMap = {
    top: 'translate(-50%, -100%)',
    bottom: 'translate(-50%, 0)',
    left: 'translate(-100%, -50%)',
    right: 'translate(0, -50%)',
  }

  const child = children as React.ReactElement<React.HTMLAttributes<HTMLElement>>
  const trigger = {
    ...child,
    props: {
      ...child.props,
      ref: triggerRef,
      onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
        show()
        child.props.onMouseEnter?.(e)
      },
      onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
        setVisible(false)
        child.props.onMouseLeave?.(e)
      },
      onFocus: (e: React.FocusEvent<HTMLElement>) => {
        show()
        child.props.onFocus?.(e)
      },
      onBlur: (e: React.FocusEvent<HTMLElement>) => {
        setVisible(false)
        child.props.onBlur?.(e)
      },
    },
  }

  return (
    <>
      {trigger}
      {mounted && visible && createPortal(
        <div
          role="tooltip"
          className={cn(
            'fixed z-[9999] pointer-events-none px-2 py-1 text-[11px] font-medium leading-tight',
            'bg-gray-900 dark:bg-gray-700 text-white rounded shadow-md whitespace-nowrap',
            className
          )}
          style={{ top: coords.top, left: coords.left, transform: transformMap[side] }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  )
}
