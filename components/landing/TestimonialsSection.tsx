"use client"
import React from 'react'
import { motion } from 'framer-motion'

export function TestimonialsSection() {
  const logos = [
    {
      src: '/sm.png',
      alt: 'StockMaster',
      title: 'StockMaster',
      width: 120,
      height: 40,
    },
    {
      src: '/inventory_logo.png',
      alt: 'Inventory Partner',
      title: 'Inventory Partner',
      width: 120,
      height: 40,
    },
    {
      src: '/warehouse_logo.png',
      alt: 'Warehouse Solutions',
      title: 'Warehouse Solutions',
      width: 120,
      height: 40,
    },
    {
      src: '/odoo_logo.png',
      alt: 'Odoo',
      title: 'Odoo',
      width: 120,
      height: 40,
    },
    {
      src: '/spit_logo.png',
      alt: 'SPIT',
      title: 'SPIT',
      width: 120,
      height: 40,
    },
  ]

  return (
    <section className="relative py-20 md:py-32 overflow-hidden bg-muted/30">
      <div className="relative z-10 max-w-[1600px] mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="text-sm uppercase tracking-wider text-muted-foreground font-medium mb-2">
            Trusted by Industry Leaders
          </p>
          <h2 className="text-3xl md:text-4xl font-bold">
            Powering Inventory Management Worldwide
          </h2>
        </motion.div>

        <div className="relative overflow-hidden py-8">
          <div className="flex space-x-8 animate-pulse">
            {logos.map((logo, index) => (
              <div key={index} className="flex-shrink-0">
                <img 
                  src={logo.src} 
                  alt={logo.alt} 
                  title={logo.title}
                  className="h-12 w-auto opacity-60 hover:opacity-100 transition-opacity"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
