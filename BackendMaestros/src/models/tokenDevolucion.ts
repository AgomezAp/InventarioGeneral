import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection.js';
import { ActaDevolucion } from './actaDevolucion.js';

/**
 * Modelo TokenDevolucion - Tokens para firma externa de devolución
 */
export class TokenDevolucion extends Model {
  public id!: number;
  public token!: string;
  public actaDevolucionId!: number;
  public correoDestinatario!: string;
  public estado!: string; // pendiente, firmado, rechazado, cancelado
  public motivoRechazo!: string;
  public fechaEnvio!: Date;
  public fechaFirma!: Date;
  public ipFirma!: string;
  public userAgent!: string;
  
  // Relación
  public actaDevolucion?: ActaDevolucion;
}

TokenDevolucion.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    token: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    actaDevolucionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: ActaDevolucion,
        key: 'id'
      }
    },
    correoDestinatario: {
      type: DataTypes.STRING,
      allowNull: false
    },
    estado: {
      type: DataTypes.ENUM('pendiente', 'firmado', 'rechazado', 'cancelado'),
      defaultValue: 'pendiente'
    },
    motivoRechazo: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    fechaEnvio: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    fechaFirma: {
      type: DataTypes.DATE,
      allowNull: true
    },
    ipFirma: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userAgent: {
      type: DataTypes.STRING(500),
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'tokens_devolucion',
    timestamps: true,
  }
);

// Relaciones
TokenDevolucion.belongsTo(ActaDevolucion, { foreignKey: 'actaDevolucionId', as: 'actaDevolucion' });
ActaDevolucion.hasMany(TokenDevolucion, { foreignKey: 'actaDevolucionId', as: 'tokensFirma' });

export default TokenDevolucion;
