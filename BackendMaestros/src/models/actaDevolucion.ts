import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection.js';

/**
 * Modelo ActaDevolucion - Actas de devolución de equipos
 * Proceso independiente del acta de entrega
 */
export class ActaDevolucion extends Model {
  public id!: number;
  public numeroActa!: string;
  public nombreReceptor!: string; // Quien recibe los equipos devueltos (área de sistemas)
  public cedulaReceptor!: string;
  public cargoReceptor!: string;
  public telefonoReceptor!: string;
  public correoReceptor!: string;
  public nombreEntrega!: string; // Quien devuelve los equipos
  public cedulaEntrega!: string;
  public cargoEntrega!: string;
  public correoEntrega!: string;
  public firmaEntrega!: string; // Firma de quien devuelve
  public firmaReceptor!: string; // Firma de quien recibe
  public fechaDevolucion!: Date;
  public estado!: string; // pendiente_firma, completada, rechazada
  public observaciones!: string;
  public Uid!: number;
  
  // Relaciones
  public detalles?: any[];
}

ActaDevolucion.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    numeroActa: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Número único del acta de devolución'
    },
    nombreReceptor: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nombre de quien recibe los equipos (sistemas)'
    },
    cedulaReceptor: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    cargoReceptor: {
      type: DataTypes.STRING,
      allowNull: true
    },
    telefonoReceptor: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    correoReceptor: {
      type: DataTypes.STRING,
      allowNull: true,  // Permitir null - el correo es opcional
      comment: 'Correo del receptor (opcional)'
    },
    nombreEntrega: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nombre de quien devuelve los equipos'
    },
    cedulaEntrega: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    cargoEntrega: {
      type: DataTypes.STRING,
      allowNull: true
    },
    correoEntrega: {
      type: DataTypes.STRING,
      allowNull: true
    },
    firmaEntrega: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Firma digital de quien devuelve (base64)'
    },
    firmaReceptor: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Firma digital de quien recibe (base64)'
    },
    fechaDevolucion: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    estado: {
      type: DataTypes.ENUM('pendiente_firma', 'completada', 'rechazada'),
      defaultValue: 'pendiente_firma'
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    Uid: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Usuario que creó el acta'
    }
  },
  {
    sequelize,
    tableName: 'actas_devolucion',
    timestamps: true,
  }
);

export default ActaDevolucion;
