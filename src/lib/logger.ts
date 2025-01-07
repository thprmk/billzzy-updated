// lib/logger.ts

type LogLevel = 'info' | 'error' | 'warn' | 'debug';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private static instance: Logger;
  
  private formatMessage(level: LogLevel, message: string, context: LogContext = {}) {
    const logData = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
      environment: process.env.VERCEL_ENV || 'development',
      deploymentId: process.env.VERCEL_GITHUB_DEPLOYMENT_SHA,
    };

    // Filter out undefined and null values
    Object.keys(logData).forEach(key => {
      if (logData[key] === undefined || logData[key] === null) {
        delete logData[key];
      }
    });

    return JSON.stringify(logData);
  }

  private formatError(error: any): LogContext {
    if (!(error instanceof Error)) {
      return { errorMessage: String(error) };
    }

    return {
      errorMessage: error.message,
      errorName: error.name,
      errorStack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
    };
  }

  info(message: string, context: LogContext = {}) {
    console.log(this.formatMessage('info', message, context));
  }

  error(message: string, error?: any, context: LogContext = {}) {
    const errorContext = error ? this.formatError(error) : {};
    console.error(this.formatMessage('error', message, {
      ...errorContext,
      ...context,
    }));
  }

  warn(message: string, context: LogContext = {}) {
    console.warn(this.formatMessage('warn', message, context));
  }

  debug(message: string, context: LogContext = {}) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
}

export const logger = Logger.getInstance();