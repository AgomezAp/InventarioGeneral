import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection.js';
import { User } from './user.js';
import { TipoInventario } from './tipoInventario.js';

/**
 * Modelo ActaConsumible - Registro de entregas de artículos de aseo y papelería
 * Un acta puede contener múltiples consumibles con sus cantidades
 */
export class ActaConsumible extends Model {
  public id!: number;
  public numeroActa!: string; // Número único del acta (ej: ACTA-ASEO-2026-001)
  public tipoInventarioId!: number; // FK a tipo_inventario (aseo o papeleria)
  public nombreReceptor!: string;
  public cedulaReceptor!: string;
  public cargoReceptor!: string;
  public areaReceptor!: string; // Área/departamento que recibe
  public correoReceptor!: string;
  public firmaReceptor!: string; // Base64 de la firma digital
  public fechaEntrega!: Date;
  public fechaFirma!: Date; // Fecha cuando se firmó digitalmente
  public estado!: string; // pendiente_firma, firmada, rechazada
  public observaciones!: string;
  public motivoRechazo!: string;
  public Uid!: number; // Usuario que creó el acta
  public detalles?: any[]; // Relación con DetalleActaConsumible
  public tipoInventario?: TipoInventario;
}

ActaConsumible.init(
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
      comment: 'Número único del acta de entrega de consumibles'
    },
    tipoInventarioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tipos_inventario',
        key: 'id'
      },
      comment: 'FK al tipo de inventario (aseo o papelería)'
    },
    nombreReceptor: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nombre completo de quien recibe los artículos'
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
    areaReceptor: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Área o departamento que recibe los artículos'
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
    estado: {
      type: DataTypes.ENUM('pendiente_firma', 'firmada', 'rechazada'),
      defaultValue: 'pendiente_firma',
      comment: 'Estado del acta'
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Observaciones generales de la entrega'
    },
    motivoRechazo: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Motivo si el acta fue rechazada'
    },
    Uid: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'Uid'
      },
      comment: 'Usuario que creó el acta'
    }
  },
  {
    sequelize,
    tableName: 'actas_consumibles',
    timestamps: true,
  }
);

// Relaciones
ActaConsumible.belongsTo(User, { foreignKey: 'Uid', as: 'creador' });
ActaConsumible.belongsTo(TipoInventario, { foreignKey: 'tipoInventarioId', as: 'tipoInventario' });

export default ActaConsumible;
