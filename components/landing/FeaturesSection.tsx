"use client"
import React from 'react'
import { motion } from 'framer-motion'
import { 
  Package, 
  Truck, 
  BarChart3, 
  FileText, 
  MapPin, 
  ArrowLeftRight,
  Bell,
  Shield
} from 'lucide-react'
import SpotlightCard from '@/components/SpotlightCard'
import '@/components/SpotlightCard.css'

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  index: number
}

function FeatureCard({ icon, title, description, index }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      style={{ willChange: 'transform, opacity' }}
      className="h-full"
    >
      <SpotlightCard 
        className="border border-black/25 dark:border-white/10 bg-card/50 backdrop-blur-sm group transition-all duration-300 "
        spotlightColor="rgba(37, 99, 235, 0.15)"
      >
        <div className="card-spotlight-content p-6">
          {/* Icon */}
          <div className="mb-4 inline-flex p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
            {icon}
          </div>

          {/* Content */}
          <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
      </SpotlightCard>
    </motion.div>
  )
}

export function FeaturesSection() {
  const features = [
    {
      icon: <Package className="h-6 w-6" />,
      title: 'Product Management',
      description: 'Comprehensive catalog with SKU tracking, variants, and bulk operations for efficient inventory control.',
    },
    {
      icon: <MapPin className="h-6 w-6" />,
      title: 'Multi-Location Support',
      description: 'Manage inventory across multiple warehouses and locations with real-time visibility.',
    },
    {
      icon: <Truck className="h-6 w-6" />,
      title: 'Smart Deliveries',
      description: 'Track shipments, manage receipts, and automate delivery workflows seamlessly.',
    },
    {
      icon: <ArrowLeftRight className="h-6 w-6" />,
      title: 'Stock Transfers',
      description: 'Effortlessly move inventory between locations with complete audit trails.',
    },
    {
      icon: <FileText className="h-6 w-6" />,
      title: 'Requisition Management',
      description: 'Streamline purchase requests with approval workflows and automated processing.',
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: 'Advanced Analytics',
      description: 'Gain insights with powerful reports, dashboards, and predictive analytics.',
    },
    {
      icon: <Bell className="h-6 w-6" />,
      title: 'Low Stock Alerts',
      description: 'Automated notifications keep you informed about inventory levels in real-time.',
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: 'Secure & Compliant',
      description: 'Enterprise-grade security with role-based access control and audit logging.',
    },
  ]

  return (
    <section id="features" className="relative py-20 md:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      
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
            Everything You Need to
            <span className="block mt-2 text-primary">
              Master Your Inventory
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mt-6">
            Powerful features designed to streamline your warehouse operations and boost efficiency
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-[1600px] mx-auto">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
