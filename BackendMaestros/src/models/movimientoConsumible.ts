import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection.js';
import { User } from './user.js';
import { Consumible } from './consumible.js';

/**
 * Modelo MovimientoConsumible - Registro de entradas y salidas de stock
 * Permite trazabilidad completa del inventario de consumibles
 */
export class MovimientoConsumible extends Model {
  public id!: number;
  public consumibleId!: number;
  public tipoMovimiento!: string; // entrada, salida, ajuste, devolucion
  public cantidad!: number;
  public stockAnterior!: number;
  public stockNuevo!: number;
  public motivo!: string; // compra, entrega, ajuste_inventario, vencimiento, etc.
  public descripcion!: string;
  public actaEntregaId!: number; // Si la salida está asociada a un acta
  public numeroDocumento!: string; // Factura, orden de compra, etc.
  public fecha!: Date;
  public Uid!: number; // Usuario que realizó el movimiento
}

MovimientoConsumible.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    consumibleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'FK al consumible'
    },
    tipoMovimiento: {
      type: DataTypes.ENUM('entrada', 'salida', 'ajuste', 'devolucion'),
      allowNull: false,
      comment: 'Tipo de movimiento de stock'
    },
    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Cantidad del movimiento (positiva para entrada, positiva para salida)'
    },
    stockAnterior: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Stock antes del movimiento'
    },
    stockNuevo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Stock después del movimiento'
    },
    motivo: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Motivo: compra, entrega, ajuste_inventario, vencimiento, perdida'
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción adicional del movimiento'
    },
    actaEntregaId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'FK al acta de entrega si aplica'
    },
    numeroDocumento: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Número de factura, orden de compra, etc.'
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
    tableName: 'movimientos_consumibles',
    timestamps: true,
  }
);

// Relaciones
MovimientoConsumible.belongsTo(User, { foreignKey: 'Uid', as: 'realizadoPor' });
MovimientoConsumible.belongsTo(Consumible, { foreignKey: 'consumibleId', as: 'consumible' });

// Relación inversa en Consumible
Consumible.hasMany(MovimientoConsumible, { foreignKey: 'consumibleId', as: 'movimientos' });
