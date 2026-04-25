"use client"
import React from 'react'
import { motion } from 'framer-motion'
import { PackageCheck, Truck, Warehouse, TrendingUp, ArrowRight, BarChart3 } from 'lucide-react'

interface ProcessStep {
  icon: React.ReactNode
  title: string
  description: string
  number: string
}

export function ProcessFlowSection() {
  const [currentStep, setCurrentStep] = React.useState(0)

  const steps: ProcessStep[] = [
    {
      icon: <PackageCheck className="h-8 w-8" />,
      title: 'Receive Stock',
      description: 'Scan and verify incoming shipments with barcode integration. Automatically update inventory levels.',
      number: '01',
    },
    {
      icon: <Warehouse className="h-8 w-8" />,
      title: 'Store Inventory',
      description: 'Assign optimal storage locations using AI-powered placement. Track every item with precision.',
      number: '02',
    },
    {
      icon: <Truck className="h-8 w-8" />,
      title: 'Process Orders',
      description: 'Streamline order fulfillment with smart picking routes. Generate shipping labels automatically.',
      number: '03',
    },
    {
      icon: <TrendingUp className="h-8 w-8" />,
      title: 'Optimize Flow',
      description: 'Gain actionable insights from real-time analytics. Predict demand and prevent stockouts.',
      number: '04',
    },
  ]

  const step = steps[currentStep]

  return (
    <section id="how-it-works" className="relative py-20 md:py-32 overflow-hidden">
      {/* Enhanced Background with multiple layers */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      
      {/* Animated gradient orbs - GPU accelerated */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{ willChange: 'transform' }}
          className="absolute top-20 left-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -80, 0],
            y: [0, 80, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{ willChange: 'transform' }}
          className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, 60, 0],
            y: [0, -60, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{ willChange: 'transform' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl"
        />
      </div>
      
      {/* Floating dots decoration - Reduced from 20 to 8 for performance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 3 + i * 0.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.1,
            }}
            style={{
              willChange: 'transform, opacity',
              left: `${10 + (i * 11)}%`,
              top: `${15 + (i * 8)}%`,
            }}
            className="absolute w-1 h-1 bg-primary/40 rounded-full"
          />
        ))}
      </div>
      
      <div className="relative z-10 max-w-[1600px] mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 text-sm font-medium text-primary mb-6">
            Simple Process
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            From Stock to Success
            <span className="block mt-2 text-primary">in Four Steps</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our streamlined workflow ensures efficient inventory management from start to finish
          </p>
        </motion.div>

        {/* Large Browser Window with Embedded Step Selector */}
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            {/* Large Browser Mockup */}
            <div className="relative rounded-lg border border-black/25 dark:border-white/10 bg-card/50 backdrop-blur-sm shadow-2xl overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-black/25 dark:border-white/10 bg-muted/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                </div>
                <div className="flex-1 mx-4 px-3 py-1 bg-background/50 rounded text-xs text-muted-foreground text-center">
                  stockmaster.app/{step.title.toLowerCase().replace(' ', '-')}
                </div>
              </div>

              {/* Main Dashboard Layout with Sidebar */}
              <div className="flex bg-gradient-to-br from-background to-muted/20 min-h-[600px]">
                {/* Embedded Step Navigation Sidebar */}
                <div className="w-80 border-r border-black/25 dark:border-white/10 bg-card/30 p-4 flex flex-col gap-3">
                  <div className="text-sm font-semibold text-muted-foreground mb-2 px-2">Workflow Steps</div>
                  {steps.map((s, index) => (
                    <motion.button
                      key={index}
                      onClick={() => setCurrentStep(index)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`text-left p-4 rounded-lg border transition-all ${
                        index === currentStep
                          ? 'border-primary bg-primary/10 shadow-md'
                          : 'border-black/25 dark:border-white/10 bg-card/50 hover:bg-card/80 hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                          index === currentStep
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {s.number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm mb-1">{s.title}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2">{s.description}</div>
                        </div>
                        {index === currentStep && (
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
                        )}
                      </div>
                    </motion.button>
                  ))}
                  
                  {/* Navigation buttons in sidebar */}
                  <div className="mt-auto pt-4 border-t border-black/25 dark:border-white/10 flex gap-2">
                    <button
                      onClick={() => setCurrentStep((prev) => (prev > 0 ? prev - 1 : steps.length - 1))}
                      className="flex-1 px-4 py-2 rounded-lg border border-black/25 dark:border-white/10 hover:bg-accent transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <ArrowRight className="h-3 w-3 rotate-180" />
                      Prev
                    </button>
                    <button
                      onClick={() => setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : 0))}
                      className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      Next
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Main Content Area */}
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex-1 p-8"
                >
                  {/* Step Header */}
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl shadow-lg">
                        {step.number}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold">{step.title}</h3>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Dashboard Content */}
                  <div className="space-y-4">
                  {currentStep === 0 && (
                    <>
                      {/* Receive Stock View */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                          <PackageCheck className="h-8 w-8 text-primary" />
                          <div className="flex-1">
                            <div className="text-sm text-muted-foreground mb-1">Scanning Item</div>
                            <div className="text-xl font-bold">SKU-12345</div>
                          </div>
                          <div className="text-green-500 font-bold">✓ Verified</div>
                        </div>
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-card/60 border border-black/25 dark:border-white/10">
                            <div className="w-10 h-10 rounded bg-muted/50" />
                            <div className="flex-1">
                              <div className="h-3 w-32 bg-muted/50 rounded mb-2" />
                              <div className="h-2 w-20 bg-muted/30 rounded" />
                            </div>
                            <div className="w-16 h-8 rounded bg-green-500/10 flex items-center justify-center text-xs text-green-500">+{i * 10}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {currentStep === 1 && (
                    <>
                      {/* Store Inventory View */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {['A-01', 'A-02', 'A-03', 'B-01', 'B-02', 'B-03'].map((loc, i) => (
                          <div key={loc} className={`p-3 rounded-lg border text-center ${
                            i === 1 ? 'bg-primary/10 border-primary' : 'bg-card/60 border-border'
                          }`}>
                            <Warehouse className="h-6 w-6 mx-auto mb-2 text-primary" />
                            <div className="text-xs font-medium">{loc}</div>
                            <div className="text-xs text-muted-foreground mt-1">{i === 1 ? 'Optimal' : `${85 - i * 10}%`}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {currentStep === 2 && (
                    <>
                      {/* Process Orders View */}
                      <div className="space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-card/60 border border-black/25 dark:border-white/10">
                            <Truck className="h-6 w-6 text-primary" />
                            <div className="flex-1">
                              <div className="text-sm font-medium mb-1">Order #{1000 + i}</div>
                              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${i * 25}%` }} />
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">{i * 25}%</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {currentStep === 3 && (
                    <>
                      {/* Optimize Flow View */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                            <TrendingUp className="h-6 w-6 text-primary mb-2" />
                            <div className="text-xs text-muted-foreground mb-1">Efficiency</div>
                            <div className="text-2xl font-bold text-primary">94%</div>
                            <div className="text-xs text-green-500 mt-1">↑ 8.2%</div>
                          </div>
                          <div className="p-4 rounded-lg bg-secondary/5 border border-secondary/20">
                            <BarChart3 className="h-6 w-6 text-secondary mb-2" />
                            <div className="text-xs text-muted-foreground mb-1">Forecast</div>
                            <div className="text-2xl font-bold text-secondary">+15%</div>
                            <div className="text-xs text-green-500 mt-1">Next 30d</div>
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-card/80 border border-black/25 dark:border-white/10">
                          <div className="text-xs text-muted-foreground mb-3">Performance Trend</div>
                          <div className="flex items-end justify-between gap-1 h-24">
                            {[45, 58, 52, 68, 72, 85, 88, 92, 89, 94].map((height, i) => (
                              <div
                                key={i}
                                className="flex-1 bg-primary/30 rounded-t hover:bg-primary/50 transition-colors"
                                style={{ height: `${height}%` }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
