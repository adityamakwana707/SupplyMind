"use client"
import React, { useRef, useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FloatingNav } from '@/components/FloatingNav'
import { HeroSection } from '@/components/landing/HeroSection'
import { KPISection } from '@/components/landing/KPISection'
import { FeaturesSection } from '@/components/landing/FeaturesSection'
import { ProcessFlowSection } from '@/components/landing/ProcessFlowSection'
import { CTASection } from '@/components/landing/CTASection'
import { Footer } from '@/components/landing/Footer'
import { SmoothCursor } from '@/components/ui/smooth-cursor'
import { Home, Smartphone, Sparkles, GitBranch } from 'lucide-react'

function LandingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const hasRedirected = useRef(false)
  const [showContent, setShowContent] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  // Create refs for smooth scrolling to sections
  const sectionRefs = {
    features: useRef<HTMLElement>(null),
    'how-it-works': useRef<HTMLElement>(null),
  }

  // Check if desktop on mount with debounce
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }
    checkDesktop()
    
    let timeoutId: NodeJS.Timeout
    const debouncedCheck = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(checkDesktop, 150)
    }
    
    window.addEventListener('resize', debouncedCheck, { passive: true })
    return () => {
      window.removeEventListener('resize', debouncedCheck)
      clearTimeout(timeoutId)
    }
  }, [])

  // Redirect all visitors to the welcome page on every visit
  useEffect(() => {
    if (hasRedirected.current) return
    hasRedirected.current = true
    
    try {
      const skipWelcome = searchParams?.get('skipWelcome') === '1' || searchParams?.get('skipWelcome') === 'true'
      // Always redirect to welcome unless explicitly skipped
      if (!skipWelcome) {
        router.replace('/welcome')
      } else {
        // Show content immediately without loading state
        setShowContent(true)
        // Clean up the URL after showing content
        setTimeout(() => {
          window.history.replaceState({}, '', '/landing')
        }, 100)
      }
    } catch (e) {
      // ignore (server render or error)
      setShowContent(true)
    }
  }, [router, searchParams])

  // Don't render content until we've decided whether to redirect
  if (!showContent) {
    return null
  }

  return (
    <>
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .fade-in {
          animation: fadeIn 0.5s ease-out;
        }
        ${isDesktop ? `
          * {
            cursor: none !important;
          }
        ` : ''}
      `}</style>
      
      <div className="min-h-screen bg-background fade-in">
        {isDesktop && <SmoothCursor />}
        
        <FloatingNav
          navItems={[
            { name: 'Home', link: '/landing', icon: <Home className="h-4 w-4" /> },
            { name: 'Features', link: '#features', icon: <Sparkles className="h-4 w-4" /> },
            { name: 'How It Works', link: '#how-it-works', icon: <GitBranch className="h-4 w-4" /> },
            { name: 'Get Started', link: '/auth/signin', icon: <Smartphone className="h-4 w-4" /> },
          ]}
          hideOnScroll
          threshold={10}
          sectionRefs={sectionRefs}
        />

        <HeroSection />
        <KPISection />
        <FeaturesSection />
        <ProcessFlowSection />
        <CTASection />
        <Footer />
      </div>
    </>
  )
}

export default function LandingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    }>
      <LandingPageContent />
    </Suspense>
  )
}
