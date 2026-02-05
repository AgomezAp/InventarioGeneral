import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application } from 'express';
import helmet from 'helmet';
import path from 'path';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { fileURLToPath } from 'url';

// Obtener __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servicios
import { websocketService, getIO as getWSIO } from '../services/websocket.service.js';
import { logger, httpLoggerMiddleware } from '../services/logger.service.js';

import sequelize from '../database/connection.js';
import RMaestros from '../routes/maestros.js';
import RUser from '../routes/user.js';
import RAnalista from '../routes/analista.js';
import RDispositivo from '../routes/dispositivo.js';
import RActaEntrega from '../routes/actaEntrega.js';
import RFirmaExterna from '../routes/firmaExterna.js';
import RActaDevolucion from '../routes/actaDevolucion.js';
import RTipoInventario from '../routes/tipoInventario.js';
import RMobiliario from '../routes/mobiliario.js';
import RConsumible from '../routes/consumible.js';
import RActaConsumible from '../routes/actaConsumible.js';
import { maestroBorrado } from './maestroBorrado.js';
import { Maestro } from './maestros.js';
import { MovimientoMaestro } from './movimientoMaestro.js';
import { User } from './user.js';
import { Analista } from './analista.js';
import { Dispositivo } from './dispositivo.js';
import { ActaEntrega } from './actaEntrega.js';
import { DetalleActa } from './detalleActa.js';
import { MovimientoDispositivo } from './movimientoDispositivo.js';
import { TokenFirma } from './tokenFirma.js';
import { ActaDevolucion } from './actaDevolucion.js';
import { DetalleDevolucion } from './detalleDevolucion.js';
import { TokenDevolucion } from './tokenDevolucion.js';
// Nuevos modelos de inventario expandido
import { TipoInventario, inicializarTiposInventario } from './tipoInventario.js';
import { Mobiliario } from './mobiliario.js';
import { MovimientoMobiliario } from './movimientoMobiliario.js';
import { Consumible } from './consumible.js';
import { MovimientoConsumible } from './movimientoConsumible.js';
// Modelos de actas de consumibles
import { ActaConsumible } from './actaConsumible.js';
import { DetalleActaConsumible } from './detalleActaConsumible.js';
import { TokenFirmaConsumible } from './tokenFirmaConsumible.js';

dotenv.config();

// Función para obtener la instancia de Socket.IO (compatibilidad hacia atrás)
export const getIO = (): SocketIOServer => getWSIO();

class Server {
  private app: Application;
  private port?: string;
  private httpServer: http.Server;
  private io: SocketIOServer | null = null;

  constructor() {
    this.app = express();
    this.port = process.env.PORT;
    
    // Crear servidor HTTP
    this.httpServer = http.createServer(this.app);
    
    // Inicializar WebSocket Service
    this.io = websocketService.initialize(this.httpServer);
    
    this.middlewares();
    this.listen();
    this.DbConnection();
    this.routes();
  }

  listen() {
    this.httpServer.listen(this.port, () => {
      logger.info(`Server corriendo en el puerto ${this.port}`);
      logger.info(`WebSocket habilitado en el puerto ${this.port}`);
      
      // Log estadísticas de WebSocket cada 5 minutos
      setInterval(() => {
        const stats = websocketService.getStats();
        logger.info('WebSocket Stats', stats);
      }, 300000);
    });
  }
  middlewares() {
    this.app.use(express.json());
    
    // Logger HTTP
    this.app.use(httpLoggerMiddleware);
    
    // Configurar helmet para permitir imágenes
    this.app.use(
      helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
        crossOriginEmbedderPolicy: false,
      })
    );
    
    // Configurar CORS con orígenes permitidos
    const allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',')
      : ["https://inventarioap.com", "http://localhost:4200"];
    
    this.app.use(
      cors({
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true
      })
    );
    
    // Servir archivos estáticos de uploads
    this.app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
    this.app.use((req, res, next) => {
      res.setTimeout(60000, () => {
        // 2 minutos
        console.log("Request has timed out.");
        res.status(408).send("Request has timed out.");
      });
      next();
    });

   /*  this.app.use(cookieParser());

    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100, // Limita cada IP a 100 peticiones por ventana de 15 minutos
      message:
        "Demasiadas peticiones desde esta IP, por favor intenta de nuevo después de 15 minutos",
    });
    this.app.use(limiter);

    // Protección contra CSRF

    this.app.use((req, res, next) => {
      res.setTimeout(60000, () => {
        // 1 minuto
        console.log("Request has timed out.");
        res.status(408).send("Request has timed out.");
      });
      next();
    }); */
  }
  routes() {
    this.app.use(RUser);
    this.app.use(RMaestros);
    this.app.use(RAnalista);
    this.app.use('/api/dispositivos', RDispositivo);
    this.app.use('/api/actas', RActaEntrega);
    this.app.use('/api/firma', RFirmaExterna);
    this.app.use('/api/actas-devolucion', RActaDevolucion);
    // Nuevas rutas de inventario expandido
    this.app.use('/api/tipos-inventario', RTipoInventario);
    this.app.use('/api/mobiliario', RMobiliario);
    this.app.use('/api/consumibles', RConsumible);
    this.app.use('/api/actas-consumibles', RActaConsumible);
  }

  async DbConnection() {
    // Conexión a la base de datos

    try {
      /* {force: true}{alter: true} */
      await sequelize.authenticate();
      
      // Migración: Cambiar 'prestado' a 'entregado' en el ENUM de estado
      await this.migrateEstadoEnum();
      
      // Migración: Eliminar constraints UNIQUE incorrectas en mobiliario y consumibles
      await this.removeIncorrectUniqueConstraints();
      
      await User.sync();
      await Analista.sync();
      await Maestro.sync();
      await MovimientoMaestro.sync();
      await maestroBorrado.sync();
      
      // Migración: Agregar columnas de stock a dispositivos si no existen
      await this.migrateDispositivoStockColumns();
      
      // Nuevos modelos de inventario
      await Dispositivo.sync();
      await ActaEntrega.sync(); 
      await DetalleActa.sync();
      await MovimientoDispositivo.sync();
      await TokenFirma.sync();
      // Modelos de devolución
      await ActaDevolucion.sync();
      await DetalleDevolucion.sync();
      await TokenDevolucion.sync();
      
      // Migración: Agregar modo híbrido a mobiliario
      await this.migrateMobiliarioHybridMode();
      
      // Nuevos modelos de inventario expandido
      await TipoInventario.sync();
      await Mobiliario.sync();
      await MovimientoMobiliario.sync();
      await Consumible.sync();
      await MovimientoConsumible.sync();
      // Modelos de actas de consumibles
      await ActaConsumible.sync();
      await DetalleActaConsumible.sync();
      await TokenFirmaConsumible.sync();
      // Inicializar tipos de inventario por defecto
      await inicializarTiposInventario();
      console.log("Conexión a la base de datos exitosa");
    } catch (error) {
      console.log("Error al conectar a la base de datos", error);
    }
  }

  /**
   * Migración para cambiar el ENUM de estado de 'prestado' a 'entregado'
   * y agregar nuevos valores de ENUM
   */
  async migrateEstadoEnum() {
    try {
      // Verificar si existe el valor 'prestado' y no existe 'entregado'
      const [results] = await sequelize.query(`
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_dispositivos_estado')
      `);
      
      const labels = (results as any[]).map(r => r.enumlabel);
      
      if (labels.includes('prestado') && !labels.includes('entregado')) {
        console.log('Migrando estado: prestado -> entregado...');
        
        // Actualizar los registros que tienen 'prestado'
        await sequelize.query(`
          UPDATE dispositivos SET estado = 'disponible' WHERE estado = 'prestado';
        `);
        
        // Renombrar el valor del ENUM
        await sequelize.query(`
          ALTER TYPE "enum_dispositivos_estado" RENAME VALUE 'prestado' TO 'entregado';
        `);
        
        console.log('Migración de estado completada');
      }
      
      // Agregar 'reservado' si no existe
      if (!labels.includes('reservado')) {
        console.log('Agregando estado: reservado...');
        await sequelize.query(`
          ALTER TYPE "enum_dispositivos_estado" ADD VALUE IF NOT EXISTS 'reservado';
        `);
        console.log('Estado reservado agregado');
      }
      
      // Verificar y agregar nuevos estados de acta si es necesario
      const [actaResults] = await sequelize.query(`
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_actas_entrega_estado')
      `);
      
      const actaLabels = (actaResults as any[]).map(r => r.enumlabel);
      
      if (!actaLabels.includes('pendiente_firma')) {
        console.log('Agregando estados de acta: pendiente_firma, rechazada...');
        await sequelize.query(`
          ALTER TYPE "enum_actas_entrega_estado" ADD VALUE IF NOT EXISTS 'pendiente_firma';
        `);
        await sequelize.query(`
          ALTER TYPE "enum_actas_entrega_estado" ADD VALUE IF NOT EXISTS 'rechazada';
        `);
        console.log('Estados de acta agregados');
      }
      
      // Verificar y agregar nuevos tipos de movimiento
      const [movResults] = await sequelize.query(`
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_movimientos_dispositivo_tipoMovimiento')
      `);
      
      const movLabels = (movResults as any[]).map(r => r.enumlabel);
      
      if (!movLabels.includes('reserva')) {
        console.log('Agregando tipos de movimiento: reserva, firma_entrega...');
        await sequelize.query(`
          ALTER TYPE "enum_movimientos_dispositivo_tipoMovimiento" ADD VALUE IF NOT EXISTS 'reserva';
        `);
        await sequelize.query(`
          ALTER TYPE "enum_movimientos_dispositivo_tipoMovimiento" ADD VALUE IF NOT EXISTS 'firma_entrega';
        `);
        console.log('Tipos de movimiento agregados');
      }
      
    } catch (error: any) {
      // Si falla, probablemente el ENUM no existe aún (primera vez)
      if (!error.message?.includes('does not exist')) {
        console.log('Error en migración de ENUM (puede ser primera ejecución):', error.message);
      }
    }
  }

  /**
   * Migración para eliminar constraints UNIQUE incorrectas
   * El nombre de mobiliario y consumibles NO debe ser único
   */
  async removeIncorrectUniqueConstraints() {
    try {
      // Verificar y eliminar constraint UNIQUE en mobiliario.nombre si existe
      const [mobiliarioConstraints] = await sequelize.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'mobiliario'
          AND constraint_type = 'UNIQUE'
          AND constraint_name LIKE '%nombre%'
      `);
      
      if (mobiliarioConstraints.length > 0) {
        console.log('Eliminando constraint UNIQUE incorrecta en mobiliario.nombre...');
        for (const constraint of mobiliarioConstraints as any[]) {
          await sequelize.query(`
            ALTER TABLE mobiliario DROP CONSTRAINT IF EXISTS "${constraint.constraint_name}";
          `);
        }
        console.log('Constraint UNIQUE en mobiliario.nombre eliminada');
      }

      // Verificar y eliminar constraint UNIQUE en consumibles.nombre si existe
      const [consumibleConstraints] = await sequelize.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'consumibles'
          AND constraint_type = 'UNIQUE'
          AND constraint_name LIKE '%nombre%'
      `);
      
      if (consumibleConstraints.length > 0) {
        console.log('Eliminando constraint UNIQUE incorrecta en consumibles.nombre...');
        for (const constraint of consumibleConstraints as any[]) {
          await sequelize.query(`
            ALTER TABLE consumibles DROP CONSTRAINT IF EXISTS "${constraint.constraint_name}";
          `);
        }
        console.log('Constraint UNIQUE en consumibles.nombre eliminada');
      }
      
    } catch (error: any) {
      // Si falla, probablemente las tablas no existen aún (primera vez)
      if (!error.message?.includes('does not exist')) {
        console.log('Error en migración de constraints UNIQUE:', error.message);
      }
    }
  }

  /**
   * Migración para agregar columnas de stock a la tabla dispositivos
   * Estas columnas permiten manejar inventario por cantidad (para accesorios, cargadores, etc.)
   */
  async migrateDispositivoStockColumns() {
    try {
      // Verificar si la columna tipoRegistro existe
      const [columns] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'dispositivos' AND column_name = 'tipoRegistro'
      `);
      
      if ((columns as any[]).length === 0) {
        console.log('Agregando columnas de stock a dispositivos...');
        
        // Agregar columna tipoRegistro
        await sequelize.query(`
          ALTER TABLE dispositivos 
          ADD COLUMN IF NOT EXISTS "tipoRegistro" VARCHAR(20) DEFAULT 'individual';
        `);
        
        // Agregar columna stockActual
        await sequelize.query(`
          ALTER TABLE dispositivos 
          ADD COLUMN IF NOT EXISTS "stockActual" INTEGER DEFAULT 1;
        `);
        
        // Agregar columna stockMinimo
        await sequelize.query(`
          ALTER TABLE dispositivos 
          ADD COLUMN IF NOT EXISTS "stockMinimo" INTEGER DEFAULT 0;
        `);
        
        console.log('Columnas de stock agregadas a dispositivos');
      }
      
    } catch (error: any) {
      console.log('Error en migración de columnas de stock en dispositivos:', error.message);
    }
  }

  /**
   * Migración para agregar modo híbrido a mobiliario
   * Permite registrar items individuales (con serial) o por stock (cantidad)
   */
  async migrateMobiliarioHybridMode() {
    try {
      // Verificar si la columna tipoRegistro existe
      const [columns] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'mobiliario' AND column_name = 'tipoRegistro'
      `);
      
      if ((columns as any[]).length === 0) {
        console.log('Agregando modo híbrido a mobiliario...');
        
        // Agregar columna tipoRegistro (default 'stock' para datos existentes)
        await sequelize.query(`
          ALTER TABLE mobiliario 
          ADD COLUMN IF NOT EXISTS "tipoRegistro" VARCHAR(20) DEFAULT 'stock';
        `);
        
        // Agregar columna serial (nullable para compatibilidad con datos existentes)
        await sequelize.query(`
          ALTER TABLE mobiliario 
          ADD COLUMN IF NOT EXISTS "serial" VARCHAR(255) NULL;
        `);
        
        console.log('✅ Modo híbrido agregado a mobiliario (datos existentes = stock)');
      }
      
    } catch (error: any) {
      console.log('Error en migración de modo híbrido en mobiliario:', error.message);
    }
  }
}

export default Server;
