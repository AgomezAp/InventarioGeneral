import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection.js';
import { Dispositivo } from './dispositivo.js';
import { User } from './user.js';

/**
 * Modelo MovimientoDispositivo - Historial/Trazabilidad completa
 * Registra todos los movimientos de cada dispositivo
 */
export class MovimientoDispositivo extends Model {
  public id!: number;
  public dispositivoId!: number;
  public tipoMovimiento!: string; // ingreso, reserva, prestamo, devolucion, cambio_estado, actualizacion, firma_entrega
  public estadoAnterior!: string;
  public estadoNuevo!: string;
  public descripcion!: string;
  public actaId!: number; // Si el movimiento está asociado a un acta
  public fecha!: Date;
  public Uid!: number; // Usuario que realizó el movimiento
}

MovimientoDispositivo.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    dispositivoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'dispositivos',
        key: 'id'
      },
      comment: 'ID del dispositivo'
    },
    tipoMovimiento: {
      type: DataTypes.ENUM('ingreso', 'reserva', 'prestamo', 'devolucion', 'cambio_estado', 'actualizacion', 'baja', 'firma_entrega'),
      allowNull: false,
      comment: 'Tipo de movimiento realizado'
    },
    estadoAnterior: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Estado antes del movimiento'
    },
    estadoNuevo: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Estado después del movimiento'
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Descripción detallada del movimiento'
    },
    actaId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID del acta relacionada (si aplica)'
    },
    fecha: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'Fecha y hora del movimiento'
    },
    Uid: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Usuario que realizó el movimiento'
    }
  },
  {
    sequelize,
    modelName: 'MovimientoDispositivo',
    tableName: 'movimientos_dispositivo',
    timestamps: false,
  }
);

// Relaciones
Dispositivo.hasMany(MovimientoDispositivo, { foreignKey: 'dispositivoId', as: 'movimientos' });
MovimientoDispositivo.belongsTo(Dispositivo, { foreignKey: 'dispositivoId', as: 'dispositivo' });

User.hasMany(MovimientoDispositivo, { foreignKey: 'Uid', as: 'movimientosRealizados' });
MovimientoDispositivo.belongsTo(User, { foreignKey: 'Uid', as: 'usuario' });
