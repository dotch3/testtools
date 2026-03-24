import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { config } from './config.js'

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
)

const transports: winston.transport[] = []

if (config.LOG_OUTPUT === 'stdout' || config.LOG_OUTPUT === 'both') {
  transports.push(new winston.transports.Console({ format: jsonFormat }))
}

if (config.LOG_OUTPUT === 'file' || config.LOG_OUTPUT === 'both') {
  transports.push(
    new DailyRotateFile({
      dirname: config.LOG_PATH,
      filename: 'app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: config.LOG_MAX_SIZE,
      maxFiles: config.LOG_MAX_FILES,
      format: jsonFormat,
    }),
  )
}

export const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  transports,
})
