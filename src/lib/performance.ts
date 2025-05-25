import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

export interface PerformanceMetrics {
  cls: number | null
  fid: number | null
  fcp: number | null
  lcp: number | null
  ttfb: number | null
  memoryUsage?: number
  renderTime: number
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: PerformanceMetrics = {
    cls: null,
    fid: null,
    fcp: null,
    lcp: null,
    ttfb: null,
    renderTime: 0
  }
  private observers: ((metrics: PerformanceMetrics) => void)[] = []

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  private constructor() {
    this.initializeVitals()
    this.trackMemoryUsage()
    this.trackRenderTime()
  }

  private initializeVitals() {
    getCLS((metric) => {
      this.metrics.cls = metric.value
      this.notifyObservers()
    })

    getFID((metric) => {
      this.metrics.fid = metric.value
      this.notifyObservers()
    })

    getFCP((metric) => {
      this.metrics.fcp = metric.value
      this.notifyObservers()
    })

    getLCP((metric) => {
      this.metrics.lcp = metric.value
      this.notifyObservers()
    })

    getTTFB((metric) => {
      this.metrics.ttfb = metric.value
      this.notifyObservers()
    })
  }

  private trackMemoryUsage() {
    try {
      if ('memory' in performance && (performance as any).memory) {
        const memoryInfo = (performance as any).memory
        if (memoryInfo.usedJSHeapSize) {
          this.metrics.memoryUsage = memoryInfo.usedJSHeapSize / (1024 * 1024) // MB
        }
      }
    } catch (error) {
      // Performance memory API not available or accessible
      console.debug('Performance memory API not available:', error)
    }
  }

  private trackRenderTime() {
    const startTime = performance.now()
    
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        if (entry.entryType === 'measure') {
          this.metrics.renderTime = entry.duration
          this.notifyObservers()
        }
      })
    })

    observer.observe({ entryTypes: ['measure'] })

    // Mark initial render completion
    requestAnimationFrame(() => {
      try {
        performance.mark('render-end')
        // Use a fallback if navigationStart is not available
        const startMark = performance.getEntriesByName('navigationStart').length > 0 
          ? 'navigationStart' 
          : 'app-start'
        performance.measure('render-time', startMark, 'render-end')
      } catch (error) {
        console.debug('Performance measurement failed:', error)
      }
    })
  }

  subscribe(callback: (metrics: PerformanceMetrics) => void) {
    this.observers.push(callback)
    return () => {
      this.observers = this.observers.filter(obs => obs !== callback)
    }
  }

  private notifyObservers() {
    this.observers.forEach(callback => callback(this.metrics))
  }

  getMetrics(): PerformanceMetrics {
    this.trackMemoryUsage() // Update memory usage
    return { ...this.metrics }
  }

  mark(name: string) {
    performance.mark(name)
  }

  measure(name: string, startMark?: string, endMark?: string) {
    performance.measure(name, startMark, endMark)
  }

  clearMarks(name?: string) {
    performance.clearMarks(name)
  }

  clearMeasures(name?: string) {
    performance.clearMeasures(name)
  }
}

// Custom hooks for React components
export const usePerformanceMonitor = () => {
  const monitor = PerformanceMonitor.getInstance()
  return monitor
}

// Performance utilities
export const measureAsyncOperation = async <T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> => {
  const monitor = PerformanceMonitor.getInstance()
  monitor.mark(`${name}-start`)
  
  try {
    const result = await operation()
    monitor.mark(`${name}-end`)
    monitor.measure(name, `${name}-start`, `${name}-end`)
    return result
  } catch (error) {
    monitor.mark(`${name}-error`)
    monitor.measure(`${name}-error`, `${name}-start`, `${name}-error`)
    throw error
  }
}

export const measureRenderTime = (componentName: string) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value
    
    descriptor.value = function (...args: any[]) {
      const monitor = PerformanceMonitor.getInstance()
      monitor.mark(`${componentName}-render-start`)
      
      const result = originalMethod.apply(this, args)
      
      requestAnimationFrame(() => {
        monitor.mark(`${componentName}-render-end`)
        monitor.measure(
          `${componentName}-render`,
          `${componentName}-render-start`,
          `${componentName}-render-end`
        )
      })
      
      return result
    }
    
    return descriptor
  }
}

// Memory leak detection
export const detectMemoryLeaks = () => {
  const initialMemory = PerformanceMonitor.getInstance().getMetrics().memoryUsage || 0
  
  return {
    check: () => {
      const currentMemory = PerformanceMonitor.getInstance().getMetrics().memoryUsage || 0
      const increase = currentMemory - initialMemory
      
      if (increase > 100) { // More than 100MB increase
        console.warn(`Potential memory leak detected: ${increase.toFixed(2)}MB increase`)
        return { hasLeak: true, increase }
      }
      
      return { hasLeak: false, increase }
    }
  }
}