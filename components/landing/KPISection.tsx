"use client"
import React, { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { Package, Warehouse, TrendingUp, Users } from 'lucide-react'

interface StatCardProps {
  icon: React.ReactNode
  value: number
  label: string
  suffix?: string
  delay?: number
}

function StatCard({ icon, value, label, suffix = '', delay = 0 }: StatCardProps) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  useEffect(() => {
    if (!isInView) return

    const duration = 2000 // 2 seconds
    const steps = 60
    const increment = value / steps
    const stepDuration = duration / steps

    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setCount(value)
        clearInterval(timer)
      } else {
        setCount(Math.floor(current))
      }
    }, stepDuration)

    return () => clearInterval(timer)
  }, [isInView, value])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      style={{ willChange: 'transform, opacity' }}
      className="relative group"
    >
      <div className="relative p-8 rounded-2xl border border-black/25 dark:border-white/10 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 p-3 rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
          <div className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            {count.toLocaleString()}{suffix}
          </div>
          <div className="text-sm text-muted-foreground font-medium">
            {label}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function KPISection() {
  const stats = [
    {
      icon: <Package className="h-7 w-7" />,
      value: 25000,
      suffix: '+',
      label: 'Items Managed',
    },
    {
      icon: <Warehouse className="h-7 w-7" />,
      value: 6,
      suffix: '',
      label: 'Active Warehouses',
    },
    {
      icon: <TrendingUp className="h-7 w-7" />,
      value: 99,
      suffix: '%',
      label: 'Inventory Accuracy',
    },
    {
      icon: <Users className="h-7 w-7" />,
      value: 50,
      suffix: '+',
      label: 'Team Members',
    },
  ]

  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      
      <div className="relative z-10 container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          style={{ willChange: 'transform, opacity' }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Powering Your Organization
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comprehensive inventory management across your entire warehouse network
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-[1600px] mx-auto">
          {stats.map((stat, index) => (
            <StatCard
              key={stat.label}
              icon={stat.icon}
              value={stat.value}
              suffix={stat.suffix}
              label={stat.label}
              delay={index * 0.1}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
