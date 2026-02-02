import { Server as SocketIOServer, Socket } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import { logger } from './logger.service.js';

// Interfaces
interface AuthenticatedSocket extends Socket {
  userId?: number;
  username?: string;
  isAuthenticated?: boolean;
}

interface RateLimitInfo {
  count: number;
  lastReset: number;
}

interface WebSocketConfig {
  jwtSecret: string;
  rateLimitWindow: number; // milliseconds
  rateLimitMax: number;
  reconnectionAttempts: number;
}

// Configuración por defecto
// IMPORTANTE: Usar el mismo secret que se usa en el login (SECRET_KEY)
const defaultConfig: WebSocketConfig = {
  jwtSecret: process.env.SECRET_KEY || 'DxVj971V5CxBQGB7hDqwOenbRbbH4mrS',
  rateLimitWindow: 60000, // 1 minuto
  rateLimitMax: 100, // máximo 100 mensajes por minuto
  reconnectionAttempts: 5
};

class WebSocketService {
  private io: SocketIOServer | null = null;
  private config: WebSocketConfig;
  private rateLimitMap: Map<string, RateLimitInfo> = new Map();
  private connectedClients: Map<string, AuthenticatedSocket> = new Map();

  constructor(config: Partial<WebSocketConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Inicializar el servidor WebSocket
   */
  initialize(httpServer: http.Server): SocketIOServer {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling']
    });

    // Middleware de autenticación
    this.io.use((socket: AuthenticatedSocket, next) => {
      this.authenticateSocket(socket, next);
    });

    // Middleware de rate limiting
    this.io.use((socket: AuthenticatedSocket, next) => {
      this.rateLimitMiddleware(socket, next);
    });

    // Configurar eventos
    this.setupEventHandlers();

    // Limpiar rate limits periódicamente
    setInterval(() => this.cleanupRateLimits(), 60000);

    logger.info('WebSocket Server inicializado');
    return this.io;
  }

  /**
   * Middleware de autenticación JWT
   */
  private authenticateSocket(socket: AuthenticatedSocket, next: (err?: Error) => void): void {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      // Permitir conexión sin autenticación pero marcar como no autenticado
      socket.isAuthenticated = false;
      logger.warn(`Conexión WebSocket sin autenticación: ${socket.id}`);
      return next();
    }

    try {
      const decoded = jwt.verify(token as string, this.config.jwtSecret) as any;
      socket.userId = decoded.Uid || decoded.userId;
      socket.username = decoded.nombre || decoded.username;
      socket.isAuthenticated = true;
      logger.info(`WebSocket autenticado: Usuario ${socket.username} (${socket.userId})`);
      next();
    } catch (error) {
      logger.error(`Error de autenticación WebSocket: ${(error as Error).message}`);
      // Permitir conexión pero como no autenticado
      socket.isAuthenticated = false;
      next();
    }
  }

  /**
   * Middleware de Rate Limiting
   */
  private rateLimitMiddleware(socket: AuthenticatedSocket, next: (err?: Error) => void): void {
    const clientId = socket.id;
    const now = Date.now();
    
    let rateLimitInfo = this.rateLimitMap.get(clientId);
    
    if (!rateLimitInfo) {
      rateLimitInfo = { count: 0, lastReset: now };
      this.rateLimitMap.set(clientId, rateLimitInfo);
    }

    // Resetear contador si ha pasado la ventana de tiempo
    if (now - rateLimitInfo.lastReset > this.config.rateLimitWindow) {
      rateLimitInfo.count = 0;
      rateLimitInfo.lastReset = now;
    }

    rateLimitInfo.count++;

    if (rateLimitInfo.count > this.config.rateLimitMax) {
      logger.warn(`Rate limit excedido para socket ${clientId}`);
      socket.emit('error', { 
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Demasiadas solicitudes. Por favor, espere un momento.'
      });
      return next(new Error('Rate limit exceeded'));
    }

    next();
  }

  /**
   * Configurar manejadores de eventos
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`🔌 Cliente conectado: ${socket.id} ${socket.isAuthenticated ? `(Usuario: ${socket.username})` : '(No autenticado)'}`);
      
      this.connectedClients.set(socket.id, socket);

      // Enviar confirmación de conexión
      socket.emit('connection:established', {
        socketId: socket.id,
        isAuthenticated: socket.isAuthenticated,
        userId: socket.userId,
        serverTime: new Date().toISOString()
      });

      // Unirse a salas
      socket.on('join', (room: string) => {
        this.handleJoinRoom(socket, room);
      });

      // Salir de salas
      socket.on('leave', (room: string) => {
        this.handleLeaveRoom(socket, room);
      });

      // Ping/Pong para mantener conexión
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });

      // Desconexión
      socket.on('disconnect', (reason) => {
        logger.info(`🔌 Cliente desconectado: ${socket.id} - Razón: ${reason}`);
        this.connectedClients.delete(socket.id);
        this.rateLimitMap.delete(socket.id);
      });

      // Errores
      socket.on('error', (error) => {
        logger.error(`Error en socket ${socket.id}:`, error);
      });
    });
  }

  /**
   * Manejar unión a sala
   */
  private handleJoinRoom(socket: AuthenticatedSocket, room: string): void {
    // Validar nombre de sala
    const validRooms = [
      'inventario', 'actas', 'devoluciones', 'consumibles', 
      'mobiliario', 'maestros', 'actas-consumibles', 'notifications'
    ];

    if (!validRooms.includes(room)) {
      logger.warn(`Intento de unirse a sala no válida: ${room} por socket ${socket.id}`);
      socket.emit('error', { code: 'INVALID_ROOM', message: 'Sala no válida' });
      return;
    }

    socket.join(room);
    logger.debug(`Socket ${socket.id} se unió a sala: ${room}`);
    
    // Notificar al cliente
    socket.emit('room:joined', { room, timestamp: Date.now() });
  }

  /**
   * Manejar salida de sala
   */
  private handleLeaveRoom(socket: AuthenticatedSocket, room: string): void {
    socket.leave(room);
    logger.debug(`Socket ${socket.id} salió de sala: ${room}`);
    socket.emit('room:left', { room, timestamp: Date.now() });
  }

  /**
   * Limpiar rate limits expirados
   */
  private cleanupRateLimits(): void {
    const now = Date.now();
    for (const [clientId, info] of this.rateLimitMap.entries()) {
      if (now - info.lastReset > this.config.rateLimitWindow * 2) {
        this.rateLimitMap.delete(clientId);
      }
    }
  }

  /**
   * Obtener instancia de Socket.IO
   */
  getIO(): SocketIOServer {
    if (!this.io) {
      throw new Error('WebSocket Server no ha sido inicializado');
    }
    return this.io;
  }

  /**
   * Emitir evento a una sala específica
   */
  emitToRoom(room: string, event: string, data: any): void {
    if (!this.io) {
      logger.warn('Intento de emitir sin servidor WebSocket inicializado');
      return;
    }
    
    this.io.to(room).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
    
    logger.debug(`Evento '${event}' emitido a sala '${room}'`);
  }

  /**
   * Emitir evento a todos los clientes
   */
  emitToAll(event: string, data: any): void {
    if (!this.io) {
      logger.warn('Intento de emitir sin servidor WebSocket inicializado');
      return;
    }
    
    this.io.emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
    
    logger.debug(`Evento '${event}' emitido a todos los clientes`);
  }

  /**
   * Emitir evento a un usuario específico (todas sus conexiones)
   */
  emitToUser(userId: number, event: string, data: any): void {
    if (!this.io) return;

    for (const [socketId, socket] of this.connectedClients.entries()) {
      if (socket.userId === userId) {
        socket.emit(event, {
          ...data,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    logger.debug(`Evento '${event}' emitido al usuario ${userId}`);
  }

  /**
   * Obtener estadísticas de conexión
   */
  getStats(): {
    totalConnections: number;
    authenticatedConnections: number;
    rooms: string[];
  } {
    let authenticated = 0;
    for (const socket of this.connectedClients.values()) {
      if (socket.isAuthenticated) authenticated++;
    }

    const rooms = this.io ? Array.from(this.io.sockets.adapter.rooms.keys()) : [];

    return {
      totalConnections: this.connectedClients.size,
      authenticatedConnections: authenticated,
      rooms: rooms.filter(r => !this.connectedClients.has(r)) // Excluir IDs de socket
    };
  }
}

// Instancia singleton
export const websocketService = new WebSocketService();

// Función helper para obtener IO (compatibilidad hacia atrás)
export const getIO = (): SocketIOServer => websocketService.getIO();
