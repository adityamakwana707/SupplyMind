"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { SmoothCursor } from '@/components/ui/smooth-cursor'

export default function WelcomePage() {
  const router = useRouter()
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const checkDesktop = () => {
      if (typeof window !== 'undefined') {
        setIsDesktop(window.innerWidth >= 1024)
      }
    }
    checkDesktop()
    
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkDesktop)
      return () => window.removeEventListener('resize', checkDesktop)
    }
  }, [])

  useEffect(() => {
    // Preload the landing page for smoother transition
    router.prefetch('/landing')
    
    // Navigate after animation completes (2.8s)
    const timer = setTimeout(() => {
      router.replace('/landing?skipWelcome=true')
    }, 2800)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <>
      <style jsx global>{`
        body {
          overflow: hidden;
        }
        ${isDesktop ? `
          * {
            cursor: none !important;
          }
        ` : ''}
      `}</style>
      
      {isDesktop && <SmoothCursor />}
      
      {/* Optimized splash screen animation - Single framer-motion sequence */}
      <motion.div 
        className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-secondary/5 z-[100000] overflow-hidden"
        initial={{ opacity: 1, scale: 1, y: 0 }}
        animate={{ 
          opacity: [1, 1, 0],
          scale: [1, 1, 0.8],
          y: [0, 0, -1000],
        }}
        transition={{
          duration: 2.8,
          times: [0, 0.7, 1],
          ease: [0.76, 0, 0.24, 1]
        }}
        style={{ 
          willChange: 'transform, opacity',
          transformOrigin: 'center top'
        }}
      >
        {/* Animated gradient orbs - GPU accelerated */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            className="absolute top-20 left-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            style={{ willChange: 'opacity' }}
          />
          <motion.div 
            className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-3xl"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            style={{ willChange: 'opacity' }}
          />
          <motion.div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            style={{ willChange: 'opacity' }}
          />
        </div>

        <div className="text-center px-6 max-w-5xl mx-auto relative z-10">
          <motion.div
            className="text-sm md:text-base lg:text-lg mb-3 text-foreground/70 tracking-[0.3em] uppercase font-light"
            initial={{ opacity: 0, y: 20 }}
            animate={{ 
              opacity: [0, 1, 1, 0],
              y: [20, 0, 0, 0],
              scale: [1, 1, 1, 0.95]
            }}
            transition={{
              duration: 2.8,
              times: [0, 0.25, 0.55, 1],
              ease: "easeInOut"
            }}
            style={{ willChange: 'transform, opacity' }}
          >
            Introducing
          </motion.div>
          <motion.h1 
            className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter leading-none font-[family-name:var(--font-poppins)] text-foreground"
            initial={{ opacity: 0, y: 20 }}
            animate={{ 
              opacity: [0, 1, 1, 0],
              y: [20, 0, 0, 0],
              scale: [1, 1, 1, 0.95]
            }}
            transition={{
              duration: 2.8,
              times: [0, 0.28, 0.58, 1],
              delay: 0.1,
              ease: "easeInOut"
            }}
            style={{ willChange: 'transform, opacity' }}
          >
            SupplyMind
          </motion.h1>
        </div>
      </motion.div>
    </>
  )
}
