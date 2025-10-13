/**
 * Sistema de logging centralizado e seguro
 * Substitui console.* calls com logging estruturado
 *
 * Environment Variables:
 * - NEXT_PUBLIC_LOG_LEVEL: Nível mínimo de log (debug|info|warn|error)
 * - NEXT_PUBLIC_ENABLE_CONSOLE_LOGS: Habilita logs no console (true|false)
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
  private logLevel: LogLevel;
  private enableConsoleLogs: boolean;

  constructor() {
    // Ler nível de log do env (padrão: error apenas - console limpo!)
    this.logLevel = (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) || 'error';

    // Habilitar console logs apenas se explicitamente configurado
    // Padrão: FALSE (console limpo em dev e prod)
    this.enableConsoleLogs = process.env.NEXT_PUBLIC_ENABLE_CONSOLE_LOGS === 'true';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(entry: LogEntry): string {
    const { level, message, timestamp, context } = entry;
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
    // Verificar se deve logar este nível
    if (!this.shouldLog(level)) {
      return;
    }

    // Se console logs não habilitado, apenas salvar no localStorage e sair
    if (!this.enableConsoleLogs) {
      const entry: LogEntry = {
        level,
        message,
        timestamp: new Date().toISOString(),
        context,
        error,
      };

      // Salvar em localStorage (últimos 100 logs)
      if (typeof window !== 'undefined') {
        this.saveToLocalStorage(entry);
      }

      // Em produção, enviar erros para serviço de monitoramento
      if (!this.isDevelopment && level === 'error') {
        this.sendToMonitoringService(entry);
      }

      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    };

    const formattedMessage = this.formatMessage(entry);

    // Console logs
    switch (level) {
      case 'debug':
        console.log(`🔍 ${formattedMessage}`, context || '');
        break;
      case 'info':
        console.info(`ℹ️  ${formattedMessage}`, context || '');
        break;
      case 'warn':
        console.warn(`⚠️  ${formattedMessage}`, context || '', error || '');
        break;
      case 'error':
        console.error(`❌ ${formattedMessage}`, context || '', error || '');
        break;
    }

    // Em produção, enviar erros para serviço de monitoramento
    if (!this.isDevelopment && level === 'error') {
      this.sendToMonitoringService(entry);
    }

    // Salvar em localStorage (últimos 100 logs)
    if (typeof window !== 'undefined') {
      this.saveToLocalStorage(entry);
    }
  }

  private sendToMonitoringService(entry: LogEntry) {
    // Implementar integração com Sentry, LogRocket, etc.
    // Por enquanto, apenas salvar localmente
    try {
      if (typeof window !== 'undefined') {
        const errorLogs = JSON.parse(localStorage.getItem('app-error-logs') || '[]');
        errorLogs.push(entry);
        // Manter apenas os últimos 50 erros
        if (errorLogs.length > 50) {
          errorLogs.splice(0, errorLogs.length - 50);
        }
        localStorage.setItem('app-error-logs', JSON.stringify(errorLogs));
      }
    } catch (err) {
      // Falha silenciosa
    }
  }

  private saveToLocalStorage(entry: LogEntry) {
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

  // Métodos públicos
  debug(message: string, context?: Record<string, any>) {
    // SILENCIAR COMPLETAMENTE debug em produção e dev
    if (!this.enableConsoleLogs) return;
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, any>) {
    // SILENCIAR COMPLETAMENTE info em produção e dev
    if (!this.enableConsoleLogs) return;
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>, error?: Error) {
    // SILENCIAR COMPLETAMENTE warn em produção e dev
    if (!this.enableConsoleLogs) return;
    this.log('warn', message, context, error);
  }

  error(message: string, context?: Record<string, any>, error?: Error) {
    // Errors sempre logam (importante!)
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
    const level = duration > 2000 ? 'warn' : 'info';
    this[level](
      `Performance: ${operation} took ${duration}ms`,
      { ...context, operation, duration }
    );
  }

  // NOVOS helpers específicos do domínio

  studentOperation(
    operation: 'create' | 'update' | 'delete' | 'read',
    studentId: string,
    studentName?: string,
    context?: Record<string, any>
  ) {
    this.info(
      `Student ${operation}: ${studentName || studentId}`,
      { ...context, operation, studentId, studentName }
    );
  }

  absenceOperation(
    operation: 'register' | 'justify' | 'delete',
    studentId: string,
    date: string,
    context?: Record<string, any>
  ) {
    this.info(
      `Absence ${operation}: ${studentId} on ${date}`,
      { ...context, operation, studentId, date }
    );
  }

  whatsappOperation(
    operation: 'send' | 'verify' | 'error',
    phone: string,
    status: 'success' | 'failed',
    context?: Record<string, any>
  ) {
    const level = status === 'success' ? 'info' : 'error';
    this[level](
      `WhatsApp ${operation}: ${phone} - ${status}`,
      { ...context, operation, phone, status }
    );
  }

  taskOperation(
    operation: 'create' | 'update' | 'complete' | 'delete',
    taskId: string,
    taskTitle?: string,
    context?: Record<string, any>
  ) {
    this.info(
      `Task ${operation}: ${taskTitle || taskId}`,
      { ...context, operation, taskId, taskTitle }
    );
  }

  interactionOperation(
    operation: 'create' | 'update' | 'delete',
    studentId: string,
    type: string,
    context?: Record<string, any>
  ) {
    this.info(
      `Interaction ${operation}: ${type} for ${studentId}`,
      { ...context, operation, studentId, type }
    );
  }

  // Helper para operações de export
  exportOperation(
    format: 'excel' | 'pdf' | 'csv',
    recordCount: number,
    duration: number,
    context?: Record<string, any>
  ) {
    this.info(
      `Export ${format}: ${recordCount} records in ${duration}ms`,
      { ...context, format, recordCount, duration }
    );
  }

  // Helper para queries lentas
  slowQuery(
    collection: string,
    duration: number,
    filters?: Record<string, any>
  ) {
    this.warn(
      `Slow Firestore query: ${collection} took ${duration}ms`,
      { collection, duration, filters }
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

// Helper para criar timers
export const createTimer = (operation: string) => {
  const startTime = performance.now();

  return {
    end: (context?: Record<string, any>) => {
      const duration = performance.now() - startTime;
      logger.performanceLog(operation, duration, context);
      return duration;
    },
    endWithError: (error: Error, context?: Record<string, any>) => {
      const duration = performance.now() - startTime;
      logger.error(
        `Operation failed: ${operation}`,
        { ...context, operation, duration },
        error
      );
      return duration;
    }
  };
};