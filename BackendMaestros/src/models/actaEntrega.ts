import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection.js';
import { User } from './user.js';

/**
 * Modelo ActaEntrega - Registro de préstamos de dispositivos
 * Un acta puede contener múltiples dispositivos
 */
export class ActaEntrega extends Model {
  public id!: number;
  public numeroActa!: string; // Número único del acta (ej: ACTA-2026-001)
  public nombreReceptor!: string;
  public cedulaReceptor!: string;
  public cargoReceptor!: string;
  public telefonoReceptor!: string;
  public correoReceptor!: string;
  public firmaReceptor!: string; // Base64 de la firma digital
  public fechaEntrega!: Date;
  public fechaFirma!: Date; // Fecha cuando se firmó digitalmente
  public fechaDevolucionEsperada!: Date;
  public fechaDevolucionReal!: Date;
  public estado!: string; // pendiente_firma, activa, devuelta_parcial, devuelta_completa, vencida, rechazada
  public observacionesEntrega!: string;
  public observacionesDevolucion!: string;
  public Uid!: number; // Usuario que creó el acta
  public detalles?: any[]; // Relación con DetalleActa
}

ActaEntrega.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    numeroActa: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      comment: 'Número único del acta de entrega'
    },
    nombreReceptor: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nombre completo de quien recibe los dispositivos'
    },
    cedulaReceptor: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Cédula/Identificación del receptor'
    },
    cargoReceptor: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Cargo de la persona que recibe'
    },
    telefonoReceptor: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    correoReceptor: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    firmaReceptor: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      comment: 'Firma digital en formato Base64'
    },
    fechaEntrega: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'Fecha y hora de la entrega'
    },
    fechaFirma: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha y hora cuando se firmó digitalmente'
    },
    fechaDevolucionEsperada: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Fecha esperada de devolución'
    },
    fechaDevolucionReal: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha real de devolución completa'
    },
    estado: {
      type: DataTypes.ENUM('pendiente_firma', 'activa', 'devuelta_parcial', 'devuelta_completa', 'vencida', 'rechazada', 'cancelada'),
      defaultValue: 'pendiente_firma',
      comment: 'Estado del acta de entrega'
    },
    observacionesEntrega: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Observaciones al momento de la entrega'
    },
    observacionesDevolucion: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Observaciones al momento de la devolución'
    },
    Uid: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Usuario que creó el acta'
    }
  },
  {
    sequelize,
    modelName: 'ActaEntrega',
    tableName: 'actas_entrega',
    timestamps: true,
  }
);

// Relación con Usuario
User.hasMany(ActaEntrega, { foreignKey: 'Uid', as: 'actas' });
ActaEntrega.belongsTo(User, { foreignKey: 'Uid', as: 'usuario' });
