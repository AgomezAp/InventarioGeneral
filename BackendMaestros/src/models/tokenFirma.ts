import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection.js';
import { ActaEntrega } from './actaEntrega.js';

/**
 * Modelo TokenFirma - Tokens para firma externa por correo
 * Estados: pendiente, firmado, rechazado, cancelado
 */
export class TokenFirma extends Model {
  public id!: number;
  public token!: string;
  public actaId!: number;
  public correoReceptor!: string;
  public estado!: string; // pendiente, firmado, rechazado, cancelado
  public motivoRechazo!: string;
  public fechaEnvio!: Date;
  public fechaFirma!: Date;
  public ipFirma!: string;
  public userAgent!: string;
  
  // Relación
  public acta?: ActaEntrega;
}

TokenFirma.init(
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
      comment: 'Token único para acceso a firma'
    },
    actaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: ActaEntrega,
        key: 'id'
      },
      comment: 'ID del acta asociada'
    },
    correoReceptor: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Correo del receptor'
    },
    estado: {
      type: DataTypes.ENUM('pendiente', 'firmado', 'rechazado', 'cancelado'),
      defaultValue: 'pendiente',
      comment: 'Estado del token de firma'
    },
    motivoRechazo: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Motivo si el receptor rechaza/devuelve para corrección'
    },
    fechaEnvio: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'Fecha de envío del correo'
    },
    fechaFirma: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha en que se firmó'
    },
    ipFirma: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'IP desde donde se firmó'
    },
    userAgent: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Navegador/dispositivo usado para firmar'
    }
  },
  {
    sequelize,
    tableName: 'tokens_firma',
    timestamps: true,
  }
);

// Relaciones
TokenFirma.belongsTo(ActaEntrega, { foreignKey: 'actaId', as: 'acta' });
ActaEntrega.hasMany(TokenFirma, { foreignKey: 'actaId', as: 'tokensFirma' });

export default TokenFirma;
