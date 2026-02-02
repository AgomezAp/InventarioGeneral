import {
  DataTypes,
  Model,
} from 'sequelize';

import sequelize from '../database/connection.js';
import { User } from './user.js';

export class MaestroEntregado extends Model {
  public Mid!: number;
  public NombreMaestro!: string;
  public maestroRecibido!: string;
  public nombre!: string;
  public firmaEntrega!: string;
  public firmaRecibe!: string;
  public descripcionEntrega!: string;
  public descripcionRecibe!: string;
  public Uid!: number;
  public nombreRecibe!: string;
  public estado!: string;
  public region!: string;
  public marca!: string;
  public modelo!: string;
  public imei!: string;
  public fechaRecibe !: Date;
  public fechaEntrega !: Date;
}

MaestroEntregado.init(
  {
    Mid: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING,
    },

    NombreMaestro: {
      type: DataTypes.STRING,
    },
    maestroRecibido:{
      type: DataTypes.STRING,
      allowNull: true
    },
    firma: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
    },
    descripcionEntrega: {
      type: DataTypes.TEXT("long"),
      allowNull: true
    },
    descripcionRecibe: {
      type: DataTypes.TEXT("long"),
      allowNull: true
    },
    Uid: {
      type: DataTypes.INTEGER
    },
    estado: {
      type: DataTypes.STRING,
      defaultValue: 'activo',
    },
    region: { // Nuevo campo región
      type: DataTypes.STRING,
      allowNull: false,
    },
    marca: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    modelo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    imei: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Maestro',
    timestamps: false,
  }
);
User.hasMany(MaestroEntregado, {foreignKey: "Uid",as: "maestroEntregado"});
MaestroEntregado.belongsTo(User, {foreignKey: "Uid",as: "usuarios"});
