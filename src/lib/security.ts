// Content Security Policy configuration
export const CSP_CONFIG = {
  defaultSrc: ["'self'"],
  scriptSrc: [
    "'self'",
    "'unsafe-inline'", // Required for React dev tools and HMR
    "'unsafe-eval'", // Required for development
    "https://apis.google.com", // For potential Google integrations
  ],
  styleSrc: [
    "'self'",
    "'unsafe-inline'", // Required for CSS-in-JS
    "https://fonts.googleapis.com",
  ],
  fontSrc: [
    "'self'",
    "https://fonts.gstatic.com",
  ],
  imgSrc: [
    "'self'",
    "data:", // For base64 images
    "blob:", // For generated images
    "https:", // For external images (CDN, user uploads)
  ],
  connectSrc: [
    "'self'",
    "https://*.supabase.co", // Supabase API
    "wss://*.supabase.co", // Supabase WebSocket
  ],
  objectSrc: ["'none'"],
  frameSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
}

// Generate CSP header string
export const generateCSPHeader = (): string => {
  return Object.entries(CSP_CONFIG)
    .map(([directive, sources]) => {
      const camelToKebab = directive.replace(/([A-Z])/g, '-$1').toLowerCase()
      return `${camelToKebab} ${sources.join(' ')}`
    })
    .join('; ')
}

// XSS Protection utilities
export class XSSProtection {
  private static readonly HTML_ESCAPE_MAP: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }

  static escapeHtml(unsafe: string): string {
    return unsafe.replace(/[&<>"'/]/g, (char) => 
      XSSProtection.HTML_ESCAPE_MAP[char] || char
    )
  }

  static sanitizeInput(input: string): string {
    // Remove potentially dangerous patterns
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/style\s*=/gi, '')
  }

  static validateFileType(file: File, allowedTypes: string[]): boolean {
    return allowedTypes.includes(file.type)
  }

  static validateFileSize(file: File, maxSizeBytes: number): boolean {
    return file.size <= maxSizeBytes
  }
}

// Rate limiting for API calls
export class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private readonly windowMs: number
  private readonly maxRequests: number

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs
    this.maxRequests = maxRequests
  }

  canMakeRequest(identifier: string): boolean {
    const now = Date.now()
    const requests = this.requests.get(identifier) || []
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs)
    
    if (validRequests.length >= this.maxRequests) {
      return false
    }
    
    // Add current request
    validRequests.push(now)
    this.requests.set(identifier, validRequests)
    
    return true
  }

  getRequestCount(identifier: string): number {
    const now = Date.now()
    const requests = this.requests.get(identifier) || []
    return requests.filter(time => now - time < this.windowMs).length
  }

  reset(identifier?: string): void {
    if (identifier) {
      this.requests.delete(identifier)
    } else {
      this.requests.clear()
    }
  }
}

// Input validation utilities
export class InputValidator {
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  static isValidPassword(password: string): boolean {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
    return passwordRegex.test(password)
  }

  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }

  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '') // Remove special characters
      .substring(0, 255) // Limit length
  }

  static validateJSONContent(content: any): boolean {
    try {
      // Check for potentially dangerous content in JSON
      const str = JSON.stringify(content)
      
      // Block script tags, javascript:, and other dangerous patterns
      const dangerousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /eval\s*\(/i,
        /Function\s*\(/i,
      ]
      
      return !dangerousPatterns.some(pattern => pattern.test(str))
    } catch {
      return false
    }
  }
}

// Secure storage utilities
export class SecureStorage {
  private static readonly ENCRYPTION_KEY_NAME = 'trpg_storage_key'

  static setItem(key: string, value: any, encrypt: boolean = false): void {
    try {
      const serialized = JSON.stringify(value)
      
      if (encrypt) {
        // In a real application, use proper encryption
        // This is a simplified example
        const encoded = btoa(serialized)
        localStorage.setItem(key, encoded)
      } else {
        localStorage.setItem(key, serialized)
      }
    } catch (error) {
      console.error('Failed to store item:', error)
    }
  }

  static getItem<T>(key: string, encrypted: boolean = false): T | null {
    try {
      const stored = localStorage.getItem(key)
      if (!stored) return null

      let serialized = stored
      if (encrypted) {
        serialized = atob(stored)
      }

      return JSON.parse(serialized)
    } catch (error) {
      console.error('Failed to retrieve item:', error)
      return null
    }
  }

  static removeItem(key: string): void {
    localStorage.removeItem(key)
  }

  static clear(): void {
    localStorage.clear()
  }
}

// Security headers for API requests
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

// Initialize security measures
export const initializeSecurity = (): void => {
  // Set CSP if not already set by server
  if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
    const meta = document.createElement('meta')
    meta.setAttribute('http-equiv', 'Content-Security-Policy')
    meta.setAttribute('content', generateCSPHeader())
    document.head.appendChild(meta)
  }

  // Prevent clickjacking
  if (window.self !== window.top) {
    window.top?.location.replace(window.self.location.href)
  }

  // Disable right-click in production (optional)
  if (import.meta.env.PROD) {
    document.addEventListener('contextmenu', (e) => {
      if (!(e.target as Element).closest('[data-allow-context-menu]')) {
        e.preventDefault()
      }
    })
  }

  // Clear sensitive data on page unload
  window.addEventListener('beforeunload', () => {
    // Clear any sensitive temporary data
    // This could include clearing certain localStorage items
  })
}

// Error boundary for security-related errors
export class SecurityError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message)
    this.name = 'SecurityError'
  }
}

// Utility to detect and prevent common attacks
export const SecurityMonitor = {
  detectXSS: (input: string): boolean => {
    const xssPatterns = [
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
    ]
    
    return xssPatterns.some(pattern => pattern.test(input))
  },

  detectSQLInjection: (input: string): boolean => {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)\b)/gi,
      /(\b(UNION|OR|AND)\b.*\b(SELECT|INSERT|UPDATE|DELETE)\b)/gi,
      /(\'|\")(\s)*(;|--|\||#)/gi,
    ]
    
    return sqlPatterns.some(pattern => pattern.test(input))
  },

  logSecurityEvent: (event: string, details: any): void => {
    console.warn(`Security Event: ${event}`, details)
    
    // In production, send to security monitoring service
    if (import.meta.env.PROD) {
      // Implementation would send to monitoring service
    }
  },
}