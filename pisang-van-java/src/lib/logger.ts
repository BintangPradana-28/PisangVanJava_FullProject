import pino from 'pino'

// Define structured logging based on environment
const isProduction = process.env.NODE_ENV === 'production'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'SYS:standard'
        }
      },
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() }
    }
  },
  timestamp: pino.stdTimeFunctions.isoTime
})
