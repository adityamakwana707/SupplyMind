"use client"
import React from 'react'
import Link from 'next/link'
import { ArrowRight, Package, BarChart3, Shield, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import WorldMap from '@/components/ui/world-map'
import { Spotlight } from '@/components/ui/spotlight-new'
import { useTheme } from 'next-themes'

export function HeroSection() {
  const { theme } = useTheme()
  
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
      {/* Spotlight effect - only in dark mode */}
      {theme === 'dark' && <Spotlight />}
      
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 to-background" />
      <div className="absolute inset-0 bg-grid-pattern opacity-40" />
      
      
      <div className="relative z-10 container mx-auto px-4 py-12 max-w-[1600px]">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              style={{ willChange: 'transform, opacity' }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 text-sm font-medium text-primary"
            >
              Unified Warehouse Management
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              style={{ willChange: 'transform, opacity' }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight"
            >
              Centralized
              <br />
              <span className="text-primary">
                Inventory Control
              </span>
              <br />
              <span className="text-muted-foreground text-4xl md:text-5xl lg:text-6xl font-normal">Across All Locations</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              style={{ willChange: 'transform, opacity' }}
              className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl"
            >
              Manage your organization's inventory across multiple warehouses with real-time visibility,
              seamless transfers, and comprehensive tracking in one unified platform.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4"
            >
              <Link
                href="/auth/signin"
                className="group px-8 py-3.5 bg-primary text-primary-foreground rounded-lg font-medium transition-all hover:bg-primary/90"
              >
                <span className="flex items-center gap-2">
                  Access Dashboard
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
              
              <Link
                href="#features"
                className="px-8 py-3.5 border border-border rounded-lg font-medium hover:bg-accent transition-colors"
              >
                Explore Features
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex items-center gap-8 pt-4"
            >
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.8, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </motion.div>
                <span className="text-sm text-muted-foreground">Real-time synchronization</span>
              </div>
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.8, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5
                  }}
                >
                  <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </motion.div>
                <span className="text-sm text-muted-foreground">Multi-location support</span>
              </div>
            </motion.div>
          </div>

          {/* Right Column - World Map Visualization */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
            style={{ willChange: 'transform, opacity' }}
            className="relative hidden lg:block"
          >
            <div className="relative scale-110 origin-center">
              {/* Map container */}
              <motion.div 
                className="relative rounded-2xl border border-black/25 dark:border-white/10 bg-card/50 backdrop-blur-sm shadow-2xl overflow-hidden min-h-[500px]"
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
              >
                <WorldMap
                  dots={[
                    {
                      start: { lat: 40.7128, lng: -74.0060 }, // New York
                      end: { lat: 51.5074, lng: -0.1278 }, // London
                      color: "#3b82f6",
                    },
                    {
                      start: { lat: 51.5074, lng: -0.1278 }, // London
                      end: { lat: 39.9042, lng: 116.4074 }, // Beijing
                      color: "#8b5cf6",
                    },
                    {
                      start: { lat: 39.9042, lng: 116.4074 }, // Beijing
                      end: { lat: -33.8688, lng: 151.2093 }, // Sydney
                      color: "#3b82f6",
                    },
                    {
                      start: { lat: -23.5505, lng: -46.6333 }, // São Paulo
                      end: { lat: -1.2921, lng: 36.8219 }, // Nairobi
                      color: "#8b5cf6",
                    },
                    {
                      start: { lat: 40.7128, lng: -74.0060 }, // New York
                      end: { lat: -23.5505, lng: -46.6333 }, // São Paulo
                      color: "#3b82f6",
                    },
                  ]}
                />
                
                {/* Stats overlay with better styling */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background/95 to-transparent backdrop-blur-sm">
                  <div className="flex gap-3">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1 }}
                      className="flex-1 p-4 rounded-lg bg-background/60 backdrop-blur-sm border border-black/10 dark:border-white/10 shadow-lg"
                    >
                      <div className="text-xs font-medium text-muted-foreground mb-1">Connected Warehouses</div>
                      <div className="text-2xl font-bold text-primary">6</div>
                      <div className="text-xs text-green-500 mt-1">↑ Network Wide</div>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.2 }}
                      className="flex-1 p-4 rounded-lg bg-background/60 backdrop-blur-sm border border-black/10 dark:border-white/10 shadow-lg"
                    >
                      <div className="text-xs font-medium text-muted-foreground mb-1">System Status</div>
                      <div className="text-2xl font-bold text-secondary">Online</div>
                      <div className="text-xs text-green-500 mt-1">All Systems</div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>

              {/* Floating accent elements */}
              <motion.div
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute -top-4 -right-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl"
              />
              <motion.div
                animate={{
                  y: [0, 10, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute -bottom-6 -left-6 w-32 h-32 bg-secondary/10 rounded-full blur-2xl"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
