import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection.js';
import { User } from './user.js';
import { Mobiliario } from './mobiliario.js';

/**
 * Modelo MovimientoMobiliario - Registro de movimientos de stock de mobiliario
 * Permite trazabilidad completa de entradas, salidas y ajustes de inventario
 */
export class MovimientoMobiliario extends Model {
  public id!: number;
  public mobiliarioId!: number;
  public tipoMovimiento!: string; // entrada, salida, ajuste, baja
  public cantidad!: number;
  public stockAnterior!: number;
  public stockNuevo!: number;
  public motivo!: string;
  public descripcion!: string;
  public numeroDocumento!: string;
  public actaEntregaId!: number;
  public fecha!: Date;
  public Uid!: number;
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
      type: DataTypes.ENUM('entrada', 'salida', 'ajuste', 'baja'),
      allowNull: false,
      comment: 'Tipo de movimiento de stock'
    },
    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Cantidad del movimiento'
    },
    stockAnterior: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Stock antes del movimiento'
    },
    stockNuevo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Stock después del movimiento'
    },
    motivo: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'otro',
      comment: 'Motivo del movimiento (compra, entrega, devolucion, ajuste_inventario, baja, etc)'
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción detallada del movimiento'
    },
    numeroDocumento: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Número de factura, orden de compra, etc'
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
