import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection.js';
import { ActaEntrega } from './actaEntrega.js';
import { Dispositivo } from './dispositivo.js';

/**
 * Modelo DetalleActa - Relación entre Actas y Dispositivos
 * Permite múltiples dispositivos por acta con estado individual
 */
export class DetalleActa extends Model {
  public id!: number;
  public actaId!: number;
  public dispositivoId!: number;
  public estadoEntrega!: string; // Estado del dispositivo al entregar
  public condicionEntrega!: string; // nuevo, bueno, regular, malo
  public fotosEntrega!: string; // JSON array de fotos al entregar
  public observacionesEntrega!: string;
  public devuelto!: boolean;
  public fechaDevolucion!: Date;
  public estadoDevolucion!: string; // disponible, dañado, perdido
  public condicionDevolucion!: string;
  public fotosDevolucion!: string; // JSON array de fotos al devolver
  public observacionesDevolucion!: string;
}

DetalleActa.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    actaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'actas_entrega',
        key: 'id'
      },
      comment: 'ID del acta de entrega'
    },
    dispositivoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'dispositivos',
        key: 'id'
      },
      comment: 'ID del dispositivo entregado'
    },
    estadoEntrega: {
      type: DataTypes.STRING,
      defaultValue: 'bueno',
      comment: 'Estado del dispositivo al momento de entregarlo'
    },
    condicionEntrega: {
      type: DataTypes.ENUM('nuevo', 'bueno', 'regular', 'malo'),
      defaultValue: 'bueno',
      comment: 'Condición física al entregar'
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
    devuelto: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Indica si el dispositivo fue devuelto'
    },
    fechaDevolucion: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de devolución del dispositivo'
    },
    estadoDevolucion: {
      type: DataTypes.ENUM('disponible', 'dañado', 'perdido'),
      allowNull: true,
      comment: 'Estado al devolver: disponible (vuelve al stock), dañado, perdido'
    },
    condicionDevolucion: {
      type: DataTypes.ENUM('nuevo', 'bueno', 'regular', 'malo'),
      allowNull: true,
      comment: 'Condición física al devolver'
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
    modelName: 'DetalleActa',
    tableName: 'detalles_acta',
    timestamps: true,
  }
);

// Relaciones
ActaEntrega.hasMany(DetalleActa, { foreignKey: 'actaId', as: 'detalles' });
DetalleActa.belongsTo(ActaEntrega, { foreignKey: 'actaId', as: 'acta' });

Dispositivo.hasMany(DetalleActa, { foreignKey: 'dispositivoId', as: 'entregas' });
DetalleActa.belongsTo(Dispositivo, { foreignKey: 'dispositivoId', as: 'dispositivo' });
