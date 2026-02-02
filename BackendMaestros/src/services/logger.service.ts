/**
 * Servicio de Logging Estructurado
 * Proporciona logging consistente con niveles, timestamps y contexto
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: any;
  stack?: string;
}

interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  colorize: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const LOG_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m'  // Red
};

const RESET_COLOR = '\x1b[0m';

class LoggerService {
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  private maxLogsInMemory = 1000;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      minLevel: (process.env.LOG_LEVEL as LogLevel) || 'info',
      enableConsole: true,
      enableFile: process.env.NODE_ENV === 'production',
      colorize: process.env.NODE_ENV !== 'production',
      ...config
    };
  }

  /**
   * Crear entrada de log
   */
  private createLogEntry(level: LogLevel, message: string, context?: any): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message
    };

    if (context) {
      if (context instanceof Error) {
        entry.context = { name: context.name, message: context.message };
        entry.stack = context.stack;
      } else {
        entry.context = context;
      }
    }

    return entry;
  }

  /**
   * Formatear para consola
   */
  private formatConsole(entry: LogEntry): string {
    const levelUpper = entry.level.toUpperCase().padEnd(5);
    const time = entry.timestamp.split('T')[1].split('.')[0]; // Solo hora
    
    let output = '';
    
    if (this.config.colorize) {
      const color = LOG_COLORS[entry.level];
      output = `${color}[${time}] [${levelUpper}]${RESET_COLOR} ${entry.message}`;
    } else {
      output = `[${time}] [${levelUpper}] ${entry.message}`;
    }

    if (entry.context && Object.keys(entry.context).length > 0) {
      output += ` ${JSON.stringify(entry.context)}`;
    }

    return output;
  }

  /**
   * Escribir log
   */
  private write(level: LogLevel, message: string, context?: any): void {
    // Verificar nivel mínimo
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.minLevel]) {
      return;
    }

    const entry = this.createLogEntry(level, message, context);

    // Guardar en memoria (circular buffer)
    this.logs.push(entry);
    if (this.logs.length > this.maxLogsInMemory) {
      this.logs.shift();
    }

    // Consola
    if (this.config.enableConsole) {
      const formatted = this.formatConsole(entry);
      switch (level) {
        case 'error':
          console.error(formatted);
          if (entry.stack) console.error(entry.stack);
          break;
        case 'warn':
          console.warn(formatted);
          break;
        default:
          console.log(formatted);
      }
    }
  }

  /**
   * Métodos de logging
   */
  debug(message: string, context?: any): void {
    this.write('debug', message, context);
  }

  info(message: string, context?: any): void {
    this.write('info', message, context);
  }

  warn(message: string, context?: any): void {
    this.write('warn', message, context);
  }

  error(message: string, context?: any): void {
    this.write('error', message, context);
  }

  /**
   * Log para requests HTTP
   */
  http(req: any, res: any, duration: number): void {
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`;
    const level: LogLevel = res.statusCode >= 400 ? 'warn' : 'info';
    
    this.write(level, message, {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration,
      ip: req.ip || req.connection?.remoteAddress
    });
  }

  /**
   * Log para operaciones de base de datos
   */
  db(operation: string, table: string, duration?: number, context?: any): void {
    const durationStr = duration ? ` (${duration}ms)` : '';
    this.debug(`DB: ${operation} on ${table}${durationStr}`, context);
  }

  /**
   * Log para WebSocket
   */
  ws(event: string, socketId: string, context?: any): void {
    this.debug(`WS: ${event} [${socketId}]`, context);
  }

  /**
   * Obtener logs recientes
   */
  getRecentLogs(count: number = 100, level?: LogLevel): LogEntry[] {
    let filtered = this.logs;
    
    if (level) {
      filtered = filtered.filter(l => l.level === level);
    }
    
    return filtered.slice(-count);
  }

  /**
   * Crear child logger con contexto adicional
   */
  child(defaultContext: any): {
    debug: (msg: string, ctx?: any) => void;
    info: (msg: string, ctx?: any) => void;
    warn: (msg: string, ctx?: any) => void;
    error: (msg: string, ctx?: any) => void;
  } {
    return {
      debug: (msg, ctx) => this.debug(msg, { ...defaultContext, ...ctx }),
      info: (msg, ctx) => this.info(msg, { ...defaultContext, ...ctx }),
      warn: (msg, ctx) => this.warn(msg, { ...defaultContext, ...ctx }),
      error: (msg, ctx) => this.error(msg, { ...defaultContext, ...ctx })
    };
  }
}

// Instancia singleton
export const logger = new LoggerService();

// Middleware de logging para Express
export const httpLoggerMiddleware = (req: any, res: any, next: () => void): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(req, res, duration);
  });
  
  next();
};
