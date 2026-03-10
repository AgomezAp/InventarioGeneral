import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection.js';
import { ActaMobiliario } from './actaMobiliario.js';

/**
 * Modelo TokenFirmaMobiliario - Tokens para firma externa de actas de mobiliario
 */
export class TokenFirmaMobiliario extends Model {
  public id!: number;
  public token!: string;
  public actaMobiliarioId!: number;
  public correoReceptor!: string;
  public estado!: string;
  public motivoRechazo!: string;
  public fechaEnvio!: Date;
  public fechaFirma!: Date;
  public ipFirma!: string;
  public userAgent!: string;

  public acta?: ActaMobiliario;
}

TokenFirmaMobiliario.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    token: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    actaMobiliarioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: ActaMobiliario,
        key: 'id'
      },
    },
    correoReceptor: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    estado: {
      type: DataTypes.ENUM('pendiente', 'firmado', 'rechazado', 'cancelado'),
      defaultValue: 'pendiente',
    },
    motivoRechazo: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    fechaEnvio: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    fechaFirma: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ipFirma: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.STRING(500),
      allowNull: true,
    }
  },
  {
    sequelize,
    tableName: 'tokens_firma_mobiliario',
    timestamps: true,
  }
);

TokenFirmaMobiliario.belongsTo(ActaMobiliario, { foreignKey: 'actaMobiliarioId', as: 'acta' });
ActaMobiliario.hasMany(TokenFirmaMobiliario, { foreignKey: 'actaMobiliarioId', as: 'tokensFirma' });
