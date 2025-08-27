/**
 * Sistema de logging centralizado e seguro
 * Substitui console.* calls com logging estruturado
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: Error;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatMessage(entry: LogEntry): string {
    const { level, message, timestamp, context } = entry;
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    };

    // Em desenvolvimento, usar console
    if (this.isDevelopment) {
      const formattedMessage = this.formatMessage(entry);
      switch (level) {
        case 'debug':
          console.debug(formattedMessage, error);
          break;
        case 'info':
          console.info(formattedMessage);
          break;
        case 'warn':
          console.warn(formattedMessage, error);
          break;
        case 'error':
          console.error(formattedMessage, error);
          break;
      }
    }

    // Em produção, enviar para serviço de monitoramento
    if (!this.isDevelopment && level === 'error') {
      this.sendToMonitoringService(entry);
    }
  }

  private sendToMonitoringService(entry: LogEntry) {
    // Implementar integração com Sentry, LogRocket, etc.
    // Por enquanto, apenas armazenar localmente
    try {
      const logs = JSON.parse(localStorage.getItem('app-logs') || '[]');
      logs.push(entry);
      // Manter apenas os últimos 100 logs
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      localStorage.setItem('app-logs', JSON.stringify(logs));
    } catch (err) {
      // Falha silenciosa em caso de problemas com localStorage
    }
  }

  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>, error?: Error) {
    this.log('warn', message, context, error);
  }

  error(message: string, context?: Record<string, any>, error?: Error) {
    this.log('error', message, context, error);
  }

  // Helpers específicos para o domínio da aplicação
  firebaseError(operation: string, error: Error, context?: Record<string, any>) {
    this.error(
      `Firebase operation failed: ${operation}`,
      { ...context, operation },
      error
    );
  }

  userAction(action: string, userId?: string, context?: Record<string, any>) {
    this.info(
      `User action: ${action}`,
      { ...context, action, userId }
    );
  }

  performanceLog(operation: string, duration: number, context?: Record<string, any>) {
    this.info(
      `Performance: ${operation} took ${duration}ms`,
      { ...context, operation, duration }
    );
  }
}

export const logger = new Logger();

// Hook para medir performance de operações
export const usePerformanceLogger = () => {
  const measureOperation = async <T>(
    operation: string,
    fn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> => {
    const startTime = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      logger.performanceLog(operation, duration, context);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      logger.error(
        `Operation failed: ${operation}`,
        { ...context, operation, duration },
        error as Error
      );
      throw error;
    }
  };

  return { measureOperation };
};