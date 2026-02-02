import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection.js';
import { User } from './user.js';
import { Mobiliario } from './mobiliario.js';

/**
 * Modelo MovimientoMobiliario - Registro de movimientos de muebles
 * Permite trazabilidad de asignaciones y cambios de ubicación
 */
export class MovimientoMobiliario extends Model {
  public id!: number;
  public mobiliarioId!: number;
  public tipoMovimiento!: string; // ingreso, asignacion, devolucion, cambio_ubicacion, baja, reparacion
  public estadoAnterior!: string;
  public estadoNuevo!: string;
  public ubicacionAnterior!: string;
  public ubicacionNueva!: string;
  public descripcion!: string;
  public actaEntregaId!: number; // Si está asociado a un acta
  public fecha!: Date;
  public Uid!: number; // Usuario que realizó el movimiento
}

MovimientoMobiliario.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    mobiliarioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'FK al mobiliario'
    },
    tipoMovimiento: {
      type: DataTypes.ENUM('ingreso', 'asignacion', 'devolucion', 'cambio_ubicacion', 'baja', 'reparacion'),
      allowNull: false,
      comment: 'Tipo de movimiento'
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
    ubicacionAnterior: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Ubicación antes del movimiento'
    },
    ubicacionNueva: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Ubicación después del movimiento'
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción del movimiento'
    },
    actaEntregaId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'FK al acta de entrega si aplica'
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
    tableName: 'movimientos_mobiliario',
    timestamps: true,
  }
);

// Relaciones
MovimientoMobiliario.belongsTo(User, { foreignKey: 'Uid', as: 'realizadoPor' });
MovimientoMobiliario.belongsTo(Mobiliario, { foreignKey: 'mobiliarioId', as: 'mobiliario' });

// Relación inversa en Mobiliario
Mobiliario.hasMany(MovimientoMobiliario, { foreignKey: 'mobiliarioId', as: 'movimientos' });
