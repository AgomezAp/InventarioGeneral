import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection.js';
import { ActaDevolucion } from './actaDevolucion.js';
import { Dispositivo } from './dispositivo.js';

/**
 * Modelo DetalleDevolucion - Detalle de dispositivos en acta de devolución
 */
export class DetalleDevolucion extends Model {
  public id!: number;
  public actaDevolucionId!: number;
  public dispositivoId!: number;
  public estadoDevolucion!: string; // disponible, dañado, perdido
  public condicionDevolucion!: string;
  public fotosDevolucion!: string; // JSON array de URLs
  public observaciones!: string;
  
  // Relaciones
  public dispositivo?: Dispositivo;
  public actaDevolucion?: ActaDevolucion;
}

DetalleDevolucion.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    actaDevolucionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: ActaDevolucion,
        key: 'id'
      }
    },
    dispositivoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Dispositivo,
        key: 'id'
      }
    },
    estadoDevolucion: {
      type: DataTypes.ENUM('disponible', 'dañado', 'perdido'),
      defaultValue: 'disponible',
      comment: 'Estado en que se devuelve el dispositivo'
    },
    condicionDevolucion: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Condición física del dispositivo al devolverlo'
    },
    fotosDevolucion: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON array de URLs de fotos de la devolución'
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'detalles_devolucion',
    timestamps: true,
  }
);

// Relaciones
ActaDevolucion.hasMany(DetalleDevolucion, { foreignKey: 'actaDevolucionId', as: 'detalles' });
DetalleDevolucion.belongsTo(ActaDevolucion, { foreignKey: 'actaDevolucionId', as: 'actaDevolucion' });

DetalleDevolucion.belongsTo(Dispositivo, { foreignKey: 'dispositivoId', as: 'dispositivo' });
Dispositivo.hasMany(DetalleDevolucion, { foreignKey: 'dispositivoId', as: 'detallesDevolucion' });

export default DetalleDevolucion;
