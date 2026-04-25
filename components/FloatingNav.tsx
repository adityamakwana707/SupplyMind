"use client"
import React, { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { useIsMobile } from './use-mobile'
import { ThemeToggle } from './ThemeToggle'

export interface FloatingNavItem {
  name: string
  link: string
  icon?: React.ReactNode
}

interface FloatingNavProps {
  navItems: FloatingNavItem[]
  className?: string
  hideOnScroll?: boolean
  threshold?: number // scrollY before nav appears
  sectionRefs?: Record<string, React.RefObject<HTMLElement>> // map of id -> ref for smooth scroll
}

export function FloatingNav({ navItems, className, hideOnScroll = true, threshold = 32, sectionRefs }: FloatingNavProps) {
  const pathname = usePathname()
  const { theme } = useTheme()
  const [visible, setVisible] = useState(true)
  const [mounted, setMounted] = useState(false)
  const lastY = useRef(0)
  const [atTop, setAtTop] = useState(true)
  const isMobile = useIsMobile()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY
      setAtTop(y < threshold)
      if (!hideOnScroll) return
      if (y > lastY.current + 4) {
        // scrolling down
        setVisible(false)
      } else if (y < lastY.current - 4) {
        // scrolling up
        setVisible(true)
      }
      lastY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [hideOnScroll, threshold])

  return (
    <div
      className={cn(
        'fixed left-1/2 top-3 z-50 -translate-x-1/2 transition-all duration-300',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6 pointer-events-none'
      )}
    >
      <nav
        className={cn(
          'flex items-center gap-1 rounded-full border border-black/25 dark:border-white/10 bg-background/70 backdrop-blur-xl px-2 py-1.5 shadow-lg',
          'transition-all',
          !atTop && 'shadow-2xl border-black/15 dark:border-white/15 bg-background/60',
          isMobile && 'gap-0.5 px-1',
          className
        )}
      >
        {/* Logo */}
        {!isMobile && (
          <div className="flex items-center pl-2 pr-1">
            {mounted && (
              <img src={theme === 'dark' ? '/app_dark.png' : '/sm.png'} alt="SM" className="h-8 w-auto" />
            )}
            {!mounted && (
              <img src="/sm.png" alt="SM" className="h-8 w-auto" />
            )}
          </div>
        )}
        
        {navItems.map(item => {
          const isHash = item.link.startsWith('#')
          const sectionId = isHash ? item.link.slice(1) : null
          const handleClick: React.MouseEventHandler = (e) => {
            if (isHash) {
              e.preventDefault()
              const targetRef = sectionRefs?.[sectionId!]
              if (targetRef?.current) {
                targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
              } else {
                const el = document.getElementById(sectionId!)
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            }
          }
          const active = !isHash && (pathname === item.link || (item.link !== '/' && pathname.startsWith(item.link)))
          return (
            <Link
              key={item.link + '-' + item.name}
              href={item.link}
              onClick={handleClick}
              className={cn(
                'group relative flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium tracking-wide transition',
                active ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                isMobile && 'px-2 py-1.5 gap-1'
              )}
              title={isMobile ? item.name : undefined}
            >
              {item.icon}
              {!isMobile && <span>{item.name}</span>}
            </Link>
          )
        })}
        
        {/* Theme Toggle */}
        <div className="ml-1 pl-1 border-l border-black/25 dark:border-white/10">
          <ThemeToggle />
        </div>
      </nav>
    </div>
  )
}

export default FloatingNav
