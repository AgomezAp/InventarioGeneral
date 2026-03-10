import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection.js';
import { User } from './user.js';

/**
 * Modelo ActaMobiliario - Registro de entregas de mobiliario
 * Un acta puede contener multiples muebles
 */
export class ActaMobiliario extends Model {
  public id!: number;
  public numeroActa!: string;
  public nombreReceptor!: string;
  public cedulaReceptor!: string;
  public cargoReceptor!: string;
  public telefonoReceptor!: string;
  public correoReceptor!: string;
  public firmaReceptor!: string;
  public fechaEntrega!: Date;
  public fechaFirma!: Date;
  public fechaDevolucionEsperada!: Date;
  public fechaDevolucionReal!: Date;
  public estado!: string;
  public observacionesEntrega!: string;
  public observacionesDevolucion!: string;
  public Uid!: number;
  public detalles?: any[];
}

ActaMobiliario.init(
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
      comment: 'Numero unico del acta (ACTA-MOB-YYYY-XXXX)'
    },
    nombreReceptor: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nombre completo de quien recibe'
    },
    cedulaReceptor: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    cargoReceptor: {
      type: DataTypes.STRING,
      allowNull: false,
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
    },
    fechaFirma: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    fechaDevolucionEsperada: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    fechaDevolucionReal: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    estado: {
      type: DataTypes.ENUM('pendiente_firma', 'activa', 'devuelta_parcial', 'devuelta_completa', 'vencida', 'rechazada', 'cancelada'),
      defaultValue: 'pendiente_firma',
    },
    observacionesEntrega: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    observacionesDevolucion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    Uid: {
      type: DataTypes.INTEGER,
      allowNull: true,
    }
  },
  {
    sequelize,
    modelName: 'ActaMobiliario',
    tableName: 'actas_mobiliario',
    timestamps: true,
  }
);

User.hasMany(ActaMobiliario, { foreignKey: 'Uid', as: 'actasMobiliario' });
ActaMobiliario.belongsTo(User, { foreignKey: 'Uid', as: 'usuario' });
