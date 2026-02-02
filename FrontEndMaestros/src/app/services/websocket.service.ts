import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, BehaviorSubject, timer, EMPTY } from 'rxjs';
import { takeUntil, retryWhen, delay, tap, switchMap, take } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../environments/environment';

export interface WebSocketEvent {
  type: string;
  data: any;
  timestamp: Date;
}

export interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  reconnectAttempt: number;
  lastConnectedAt: Date | null;
  lastDisconnectedAt: Date | null;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class WebsocketService implements OnDestroy {
  private socket: Socket | null = null;
  private destroy$ = new Subject<void>();
  
  // Estado de conexión detallado
  private connectionStatus$ = new BehaviorSubject<ConnectionStatus>({
    connected: false,
    reconnecting: false,
    reconnectAttempt: 0,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
    error: null
  });
  
  // Subjects para diferentes tipos de eventos
  private dispositivoUpdated$ = new Subject<any>();
  private actaEntregaUpdated$ = new Subject<any>();
  private actaDevolucionUpdated$ = new Subject<any>();
  private inventarioUpdated$ = new Subject<any>();
  
  // Nuevos subjects para consumibles, mobiliario, maestros
  private consumibleUpdated$ = new Subject<any>();
  private mobiliarioUpdated$ = new Subject<any>();
  private maestroUpdated$ = new Subject<any>();
  private actaConsumibleUpdated$ = new Subject<any>();
  
  // Subject para notificaciones en tiempo real
  private notification$ = new Subject<{ type: string; message: string; data?: any }>();

  // Cola de mensajes para retry
  private messageQueue: { event: string; data: any }[] = [];
  private maxQueueSize = 50;

  // Configuración de reconexión
  private reconnectConfig = {
    maxAttempts: 10,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 1.5
  };

  constructor(private toastr: ToastrService) {
    this.connect();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }

  /**
   * Conectar al servidor WebSocket
   */
  connect(): void {
    if (this.socket?.connected) {
      console.log('WebSocket ya conectado');
      return;
    }

    // Usar la URL base sin el /api
    const wsUrl = environment.apiUrl.replace('/api/', '').replace('/api', '');
    
    console.log('🔌 Conectando a WebSocket:', wsUrl);
    
    // Obtener token de autenticación
    const token = localStorage.getItem('token');
    
    this.socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.reconnectConfig.maxAttempts,
      reconnectionDelay: this.reconnectConfig.initialDelay,
      reconnectionDelayMax: this.reconnectConfig.maxDelay,
      auth: { token }
    });

    this.setupConnectionHandlers();
    this.setupEventListeners();
  }

  /**
   * Configurar manejadores de conexión con feedback visual
   */
  private setupConnectionHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket conectado:', this.socket?.id);
      
      this.updateConnectionStatus({
        connected: true,
        reconnecting: false,
        reconnectAttempt: 0,
        lastConnectedAt: new Date(),
        error: null
      });

      // Notificación de reconexión exitosa si estaba reconectando
      const status = this.connectionStatus$.value;
      if (status.lastDisconnectedAt) {
        this.toastr.success('Conexión restablecida', 'Conectado', {
          timeOut: 2000,
          progressBar: true
        });
      }

      // Procesar cola de mensajes pendientes
      this.processMessageQueue();
      
      // Unirse a las salas relevantes
      this.joinRoom('inventario');
      this.joinRoom('actas');
      this.joinRoom('devoluciones');
      this.joinRoom('consumibles');
      this.joinRoom('mobiliario');
      this.joinRoom('maestros');
      this.joinRoom('actas-consumibles');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket desconectado:', reason);
      this.updateConnectionStatus({
        connected: false,
        lastDisconnectedAt: new Date(),
        error: reason
      });

      // Notificación de desconexión
      if (reason !== 'io client disconnect') {
        this.toastr.warning('Conexión perdida. Reconectando...', 'Desconectado', {
          timeOut: 3000,
          progressBar: true
        });
      }
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Intento de reconexión #${attemptNumber}`);
      this.updateConnectionStatus({
        reconnecting: true,
        reconnectAttempt: attemptNumber
      });
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Reconexión fallida después de todos los intentos');
      this.updateConnectionStatus({
        reconnecting: false,
        error: 'No se pudo reconectar al servidor'
      });

      this.toastr.error(
        'No se pudo reconectar. Verifique su conexión e intente recargar la página.',
        'Error de conexión',
        { timeOut: 0, closeButton: true }
      );
    });

    this.socket.on('connect_error', (error) => {
      console.error('Error de conexión WebSocket:', error.message);
      this.updateConnectionStatus({
        connected: false,
        error: error.message
      });
    });

    // Error del servidor (rate limit, etc.)
    this.socket.on('error', (error: { code: string; message: string }) => {
      console.error('Error WebSocket:', error);
      if (error.code === 'RATE_LIMIT_EXCEEDED') {
        this.toastr.warning(error.message, 'Límite excedido');
      }
    });
  }

  /**
   * Configurar listeners para eventos del servidor
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Eventos de dispositivos
    this.socket.on('dispositivo:created', (data) => {
      console.log('📦 Dispositivo creado:', data);
      this.dispositivoUpdated$.next({ action: 'created', data });
      this.inventarioUpdated$.next({ action: 'refresh' });
      this.emitNotification('success', 'Nuevo dispositivo agregado al inventario');
    });

    this.socket.on('dispositivo:updated', (data) => {
      console.log('📦 Dispositivo actualizado:', data);
      this.dispositivoUpdated$.next({ action: 'updated', data });
      this.inventarioUpdated$.next({ action: 'refresh' });
    });

    this.socket.on('dispositivo:deleted', (data) => {
      console.log('📦 Dispositivo eliminado:', data);
      this.dispositivoUpdated$.next({ action: 'deleted', data });
      this.inventarioUpdated$.next({ action: 'refresh' });
    });

    // Eventos de actas de entrega
    this.socket.on('acta:created', (data) => {
      console.log('📄 Acta creada:', data);
      this.actaEntregaUpdated$.next({ action: 'created', data });
      this.inventarioUpdated$.next({ action: 'refresh' });
    });

    this.socket.on('acta:signed', (data) => {
      console.log('✍️ Acta firmada:', data);
      this.actaEntregaUpdated$.next({ action: 'signed', data });
      this.inventarioUpdated$.next({ action: 'refresh' });
    });

    this.socket.on('acta:rejected', (data) => {
      console.log('❌ Acta rechazada:', data);
      this.actaEntregaUpdated$.next({ action: 'rejected', data });
      this.inventarioUpdated$.next({ action: 'refresh' });
    });

    // Eventos de actas de devolución
    this.socket.on('devolucion:created', (data) => {
      console.log('🔄 Devolución creada:', data);
      this.actaDevolucionUpdated$.next({ action: 'created', data });
      this.inventarioUpdated$.next({ action: 'refresh' });
    });

    this.socket.on('devolucion:signed', (data) => {
      console.log('✍️ Devolución firmada:', data);
      this.actaDevolucionUpdated$.next({ action: 'signed', data });
      this.inventarioUpdated$.next({ action: 'refresh' });
    });

    this.socket.on('devolucion:rejected', (data) => {
      console.log('❌ Devolución rechazada:', data);
      this.actaDevolucionUpdated$.next({ action: 'rejected', data });
      this.inventarioUpdated$.next({ action: 'refresh' });
    });

    // Evento genérico de actualización
    this.socket.on('refresh', (data) => {
      console.log('🔄 Refresh recibido:', data);
      this.inventarioUpdated$.next({ action: 'refresh', data });
    });

    // ==================== EVENTOS DE CONSUMIBLES ====================
    this.socket.on('consumible:created', (data) => {
      console.log('🧹 Consumible creado:', data);
      this.consumibleUpdated$.next({ action: 'created', data });
      this.inventarioUpdated$.next({ action: 'refresh' });
    });

    this.socket.on('consumible:updated', (data) => {
      console.log('🧹 Consumible actualizado:', data);
      this.consumibleUpdated$.next({ action: 'updated', data });
      this.inventarioUpdated$.next({ action: 'refresh' });
    });

    this.socket.on('consumible:deleted', (data) => {
      console.log('🧹 Consumible eliminado:', data);
      this.consumibleUpdated$.next({ action: 'deleted', data });
      this.inventarioUpdated$.next({ action: 'refresh' });
    });

    this.socket.on('consumible:stockUpdated', (data) => {
      console.log('📊 Stock consumible actualizado:', data);
      this.consumibleUpdated$.next({ action: 'stockUpdated', data });
      this.inventarioUpdated$.next({ action: 'refresh' });
    });

    // ==================== EVENTOS DE MOBILIARIO ====================
    this.socket.on('mobiliario:created', (data) => {
      console.log('🪑 Mobiliario creado:', data);
      this.mobiliarioUpdated$.next({ action: 'created', data });
      this.inventarioUpdated$.next({ action: 'refresh' });
    });

    this.socket.on('mobiliario:updated', (data) => {
      console.log('🪑 Mobiliario actualizado:', data);
      this.mobiliarioUpdated$.next({ action: 'updated', data });
      this.inventarioUpdated$.next({ action: 'refresh' });
    });

    this.socket.on('mobiliario:deleted', (data) => {
      console.log('🪑 Mobiliario eliminado:', data);
      this.mobiliarioUpdated$.next({ action: 'deleted', data });
      this.inventarioUpdated$.next({ action: 'refresh' });
    });

    this.socket.on('mobiliario:stockUpdated', (data) => {
      console.log('📦 Stock mobiliario actualizado:', data);
      this.mobiliarioUpdated$.next({ action: 'stockUpdated', data });
      this.inventarioUpdated$.next({ action: 'refresh' });
    });

    // ==================== EVENTOS DE MAESTROS (Celulares) ====================
    this.socket.on('maestro:created', (data) => {
      console.log('📱 Maestro creado:', data);
      this.maestroUpdated$.next({ action: 'created', data });
      this.inventarioUpdated$.next({ action: 'refresh' });
    });

    this.socket.on('maestro:updated', (data) => {
      console.log('📱 Maestro actualizado:', data);
      this.maestroUpdated$.next({ action: 'updated', data });
      this.inventarioUpdated$.next({ action: 'refresh' });
    });

    this.socket.on('maestro:deleted', (data) => {
      console.log('📱 Maestro eliminado:', data);
      this.maestroUpdated$.next({ action: 'deleted', data });
      this.inventarioUpdated$.next({ action: 'refresh' });
    });

    this.socket.on('maestro:entregado', (data) => {
      console.log('📱 Maestro entregado:', data);
      this.maestroUpdated$.next({ action: 'entregado', data });
      this.inventarioUpdated$.next({ action: 'refresh' });
    });

    this.socket.on('maestro:reactivado', (data) => {
      console.log('📱 Maestro reactivado:', data);
      this.maestroUpdated$.next({ action: 'reactivado', data });
      this.inventarioUpdated$.next({ action: 'refresh' });
    });

    // ==================== EVENTOS DE ACTAS DE CONSUMIBLES ====================
    this.socket.on('actaConsumible:created', (data) => {
      console.log('📄 Acta consumible creada:', data);
      this.actaConsumibleUpdated$.next({ action: 'created', data });
      this.consumibleUpdated$.next({ action: 'stockUpdated', data });
    });

    this.socket.on('actaConsumible:signed', (data) => {
      console.log('✍️ Acta consumible firmada:', data);
      this.actaConsumibleUpdated$.next({ action: 'signed', data });
    });

    this.socket.on('actaConsumible:rejected', (data) => {
      console.log('❌ Acta consumible rechazada:', data);
      this.actaConsumibleUpdated$.next({ action: 'rejected', data });
      this.consumibleUpdated$.next({ action: 'stockUpdated', data });
    });
  }

  /**
   * Unirse a una sala
   */
  joinRoom(room: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join', room);
    }
  }

  /**
   * Salir de una sala
   */
  leaveRoom(room: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave', room);
    }
  }

  /**
   * Desconectar
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.updateConnectionStatus({
        connected: false,
        lastDisconnectedAt: new Date()
      });
    }
  }

  /**
   * Actualizar estado de conexión
   */
  private updateConnectionStatus(update: Partial<ConnectionStatus>): void {
    const current = this.connectionStatus$.getValue();
    this.connectionStatus$.next({ ...current, ...update });
  }

  /**
   * Procesar cola de mensajes pendientes
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.socket?.connected) {
      const message = this.messageQueue.shift();
      if (message) {
        this.socket.emit(message.event, message.data);
        console.log('📤 Mensaje de cola enviado:', message.event);
      }
    }
  }

  /**
   * Emitir notificación al observable
   */
  private emitNotification(type: string, message: string, data?: any): void {
    this.notification$.next({ type, message, data });
    
    // También mostrar toast según el tipo
    switch (type) {
      case 'success':
        this.toastr.success(message, 'Actualización', { timeOut: 3000 });
        break;
      case 'info':
        this.toastr.info(message, 'Información', { timeOut: 3000 });
        break;
      case 'warning':
        this.toastr.warning(message, 'Advertencia', { timeOut: 4000 });
        break;
      case 'error':
        this.toastr.error(message, 'Error', { timeOut: 5000 });
        break;
    }
  }

  /**
   * Agregar mensaje a la cola para retry
   */
  queueMessage(event: string, data: any): void {
    if (this.messageQueue.length >= this.maxQueueSize) {
      this.messageQueue.shift(); // Remover el más antiguo
    }
    this.messageQueue.push({ event, data });
    console.log('📥 Mensaje encolado:', event);
  }

  // Observables para suscribirse a eventos
  
  get isConnected$(): Observable<boolean> {
    return new Observable(observer => {
      const sub = this.connectionStatus$.subscribe(status => {
        observer.next(status.connected);
      });
      return () => sub.unsubscribe();
    });
  }

  get onConnectionStatus$(): Observable<ConnectionStatus> {
    return this.connectionStatus$.asObservable();
  }

  get onNotification$(): Observable<{ type: string; message: string; data?: any }> {
    return this.notification$.asObservable();
  }

  get onDispositivoUpdate$(): Observable<any> {
    return this.dispositivoUpdated$.asObservable();
  }

  get onActaEntregaUpdate$(): Observable<any> {
    return this.actaEntregaUpdated$.asObservable();
  }

  get onActaDevolucionUpdate$(): Observable<any> {
    return this.actaDevolucionUpdated$.asObservable();
  }

  get onInventarioUpdate$(): Observable<any> {
    return this.inventarioUpdated$.asObservable();
  }

  // ==================== OBSERVABLES DE CONSUMIBLES ====================
  get onConsumibleUpdate$(): Observable<any> {
    return this.consumibleUpdated$.asObservable();
  }

  // ==================== OBSERVABLES DE MOBILIARIO ====================
  get onMobiliarioUpdate$(): Observable<any> {
    return this.mobiliarioUpdated$.asObservable();
  }

  // ==================== OBSERVABLES DE MAESTROS ====================
  get onMaestroUpdate$(): Observable<any> {
    return this.maestroUpdated$.asObservable();
  }

  // ==================== OBSERVABLES DE ACTAS CONSUMIBLES ====================
  get onActaConsumibleUpdate$(): Observable<any> {
    return this.actaConsumibleUpdated$.asObservable();
  }

  // Métodos específicos para tipos de eventos de dispositivos
  onDispositivoCreated(): Observable<any> {
    return new Observable(observer => {
      const sub = this.dispositivoUpdated$.subscribe(event => {
        if (event.action === 'created') {
          observer.next(event.data);
        }
      });
      return () => sub.unsubscribe();
    });
  }

  onDispositivoUpdated(): Observable<any> {
    return new Observable(observer => {
      const sub = this.dispositivoUpdated$.subscribe(event => {
        if (event.action === 'updated') {
          observer.next(event.data);
        }
      });
      return () => sub.unsubscribe();
    });
  }

  onDispositivoDeleted(): Observable<any> {
    return new Observable(observer => {
      const sub = this.dispositivoUpdated$.subscribe(event => {
        if (event.action === 'deleted') {
          observer.next(event.data);
        }
      });
      return () => sub.unsubscribe();
    });
  }

  // Métodos específicos para tipos de eventos de actas de entrega
  onActaCreated(): Observable<any> {
    return new Observable(observer => {
      const sub = this.actaEntregaUpdated$.subscribe(event => {
        if (event.action === 'created') {
          observer.next(event.data);
        }
      });
      return () => sub.unsubscribe();
    });
  }

  onActaSigned(): Observable<any> {
    return new Observable(observer => {
      const sub = this.actaEntregaUpdated$.subscribe(event => {
        if (event.action === 'signed') {
          observer.next(event.data);
        }
      });
      return () => sub.unsubscribe();
    });
  }

  onActaRejected(): Observable<any> {
    return new Observable(observer => {
      const sub = this.actaEntregaUpdated$.subscribe(event => {
        if (event.action === 'rejected') {
          observer.next(event.data);
        }
      });
      return () => sub.unsubscribe();
    });
  }

  // Métodos específicos para tipos de eventos de actas de devolución
  onDevolucionCreated(): Observable<any> {
    return new Observable(observer => {
      const sub = this.actaDevolucionUpdated$.subscribe(event => {
        if (event.action === 'created') {
          observer.next(event.data);
        }
      });
      return () => sub.unsubscribe();
    });
  }

  onDevolucionSigned(): Observable<any> {
    return new Observable(observer => {
      const sub = this.actaDevolucionUpdated$.subscribe(event => {
        if (event.action === 'signed') {
          observer.next(event.data);
        }
      });
      return () => sub.unsubscribe();
    });
  }

  onDevolucionRejected(): Observable<any> {
    return new Observable(observer => {
      const sub = this.actaDevolucionUpdated$.subscribe(event => {
        if (event.action === 'rejected') {
          observer.next(event.data);
        }
      });
      return () => sub.unsubscribe();
    });
  }

  // ==================== MÉTODOS DE CONSUMIBLES ====================
  onConsumibleCreated(): Observable<any> {
    return new Observable(observer => {
      const sub = this.consumibleUpdated$.subscribe(event => {
        if (event.action === 'created') {
          observer.next(event.data);
        }
      });
      return () => sub.unsubscribe();
    });
  }

  onConsumibleUpdated(): Observable<any> {
    return new Observable(observer => {
      const sub = this.consumibleUpdated$.subscribe(event => {
        if (event.action === 'updated') {
          observer.next(event.data);
        }
      });
      return () => sub.unsubscribe();
    });
  }

  onConsumibleDeleted(): Observable<any> {
    return new Observable(observer => {
      const sub = this.consumibleUpdated$.subscribe(event => {
        if (event.action === 'deleted') {
          observer.next(event.data);
        }
      });
      return () => sub.unsubscribe();
    });
  }

  onConsumibleStockUpdated(): Observable<any> {
    return new Observable(observer => {
      const sub = this.consumibleUpdated$.subscribe(event => {
        if (event.action === 'stockUpdated') {
          observer.next(event.data);
        }
      });
      return () => sub.unsubscribe();
    });
  }

  // ==================== MÉTODOS DE MOBILIARIO ====================
  onMobiliarioCreated(): Observable<any> {
    return new Observable(observer => {
      const sub = this.mobiliarioUpdated$.subscribe(event => {
        if (event.action === 'created') {
          observer.next(event.data);
        }
      });
      return () => sub.unsubscribe();
    });
  }

  onMobiliarioUpdated(): Observable<any> {
    return new Observable(observer => {
      const sub = this.mobiliarioUpdated$.subscribe(event => {
        if (event.action === 'updated') {
          observer.next(event.data);
        }
      });
      return () => sub.unsubscribe();
    });
  }

  onMobiliarioDeleted(): Observable<any> {
    return new Observable(observer => {
      const sub = this.mobiliarioUpdated$.subscribe(event => {
        if (event.action === 'deleted') {
          observer.next(event.data);
        }
      });
      return () => sub.unsubscribe();
    });
  }

  onMobiliarioStockUpdated(): Observable<any> {
    return new Observable(observer => {
      const sub = this.mobiliarioUpdated$.subscribe(event => {
        if (event.action === 'stockUpdated') {
          observer.next(event.data);
        }
      });
      return () => sub.unsubscribe();
    });
  }

  // ==================== MÉTODOS DE MAESTROS ====================
  onMaestroCreated(): Observable<any> {
    return new Observable(observer => {
      const sub = this.maestroUpdated$.subscribe(event => {
        if (event.action === 'created') {
          observer.next(event.data);
        }
      });
      return () => sub.unsubscribe();
    });
  }

  onMaestroUpdated(): Observable<any> {
    return new Observable(observer => {
      const sub = this.maestroUpdated$.subscribe(event => {
        if (event.action === 'updated') {
          observer.next(event.data);
        }
      });
      return () => sub.unsubscribe();
    });
  }

  onMaestroDeleted(): Observable<any> {
    return new Observable(observer => {
      const sub = this.maestroUpdated$.subscribe(event => {
        if (event.action === 'deleted') {
          observer.next(event.data);
        }
      });
      return () => sub.unsubscribe();
    });
  }

  onMaestroEntregado(): Observable<any> {
    return new Observable(observer => {
      const sub = this.maestroUpdated$.subscribe(event => {
        if (event.action === 'entregado') {
          observer.next(event.data);
        }
      });
      return () => sub.unsubscribe();
    });
  }

  onMaestroReactivado(): Observable<any> {
    return new Observable(observer => {
      const sub = this.maestroUpdated$.subscribe(event => {
        if (event.action === 'reactivado') {
          observer.next(event.data);
        }
      });
      return () => sub.unsubscribe();
    });
  }

  // ==================== MÉTODOS DE ACTAS DE CONSUMIBLES ====================
  onActaConsumibleCreated(): Observable<any> {
    return new Observable(observer => {
      const sub = this.actaConsumibleUpdated$.subscribe(event => {
        if (event.action === 'created') {
          observer.next(event.data);
        }
      });
      return () => sub.unsubscribe();
    });
  }

  onActaConsumibleSigned(): Observable<any> {
    return new Observable(observer => {
      const sub = this.actaConsumibleUpdated$.subscribe(event => {
        if (event.action === 'signed') {
          observer.next(event.data);
        }
      });
      return () => sub.unsubscribe();
    });
  }

  onActaConsumibleRejected(): Observable<any> {
    return new Observable(observer => {
      const sub = this.actaConsumibleUpdated$.subscribe(event => {
        if (event.action === 'rejected') {
          observer.next(event.data);
        }
      });
      return () => sub.unsubscribe();
    });
  }
}
