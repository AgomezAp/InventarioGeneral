import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection.js';
import { ActaMobiliario } from './actaMobiliario.js';
import { Mobiliario } from './mobiliario.js';

/**
 * Modelo DetalleActaMobiliario - Items de mobiliario en un acta
 * Usa cantidadDevuelta (INT) para devoluciones parciales por cantidad
 */
export class DetalleActaMobiliario extends Model {
  public id!: number;
  public actaMobiliarioId!: number;
  public mobiliarioId!: number;
  public cantidad!: number;
  public condicionEntrega!: string;
  public fotosEntrega!: string;
  public observacionesEntrega!: string;
  public cantidadDevuelta!: number;
  public fechaUltimaDevolucion!: Date;
  public estadoDevolucion!: string;
  public condicionDevolucion!: string;
  public fotosDevolucion!: string;
  public observacionesDevolucion!: string;
}

DetalleActaMobiliario.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    actaMobiliarioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'actas_mobiliario',
        key: 'id'
      },
    },
    mobiliarioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'mobiliario',
        key: 'id'
      },
    },
    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    condicionEntrega: {
      type: DataTypes.ENUM('nuevo', 'bueno', 'regular', 'malo'),
      defaultValue: 'bueno',
    },
    fotosEntrega: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      comment: 'JSON array con URLs de fotos al entregar'
    },
    observacionesEntrega: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    cantidadDevuelta: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Cantidad devuelta hasta ahora (para devoluciones parciales)'
    },
    fechaUltimaDevolucion: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    estadoDevolucion: {
      type: DataTypes.ENUM('disponible', 'dañado', 'perdido'),
      allowNull: true,
    },
    condicionDevolucion: {
      type: DataTypes.ENUM('nuevo', 'bueno', 'regular', 'malo'),
      allowNull: true,
    },
    fotosDevolucion: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      comment: 'JSON array con URLs de fotos al devolver'
    },
    observacionesDevolucion: {
      type: DataTypes.TEXT,
      allowNull: true,
    }
  },
  {
    sequelize,
    modelName: 'DetalleActaMobiliario',
    tableName: 'detalles_acta_mobiliario',
    timestamps: true,
  }
);

ActaMobiliario.hasMany(DetalleActaMobiliario, { foreignKey: 'actaMobiliarioId', as: 'detalles' });
DetalleActaMobiliario.belongsTo(ActaMobiliario, { foreignKey: 'actaMobiliarioId', as: 'acta' });

Mobiliario.hasMany(DetalleActaMobiliario, { foreignKey: 'mobiliarioId', as: 'entregas' });
DetalleActaMobiliario.belongsTo(Mobiliario, { foreignKey: 'mobiliarioId', as: 'mobiliario' });
