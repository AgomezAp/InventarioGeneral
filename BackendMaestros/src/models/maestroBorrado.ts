import {
  DataTypes,
  Model,
} from 'sequelize';

import sequelize from '../database/connection.js';
import { User } from './user.js';

export class maestroBorrado extends Model {
  public Mid!: number;
  public NombreMaestro!: string;
  public maestroRecibido!: string;
  public nombre!: string;
  public firmaEntrega!: string;
  public firmaRecibe!: string;
  public estado!: string;
  public descripcionEntrega!: string;
  public descripcionRecibe!: string;
  public Uid!: number;
  public NombreRecibe!: string; 
  public region!: string;
  public marca!: string;
  public modelo!: string;
  public imei!: string;
  public fechaRecibe !: Date;
  public fechaEntrega !: Date;
  public tipoMovimiento!: string;
}

maestroBorrado.init(
  {
    Mid: {
      type: DataTypes.INTEGER,

      autoIncrement: true,

      primaryKey: true,
    },

    nombre: {
      type: DataTypes.STRING,

      allowNull: false,
    },


    NombreMaestro: {
      type: DataTypes.STRING,

      allowNull: false, 
    },
    maestroRecibido:{
      type: DataTypes.STRING,
      allowNull: true
    },
    firmaEntrega: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    firmaRecibe: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
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
      type: DataTypes.INTEGER,
    },
    nombreCompletoRecibe: {
      type: DataTypes.STRING,
      allowNull: false,
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
    fechaRecibe: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    fechaEntrega: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
  },

  {
    sequelize,

    modelName: "MaestroBorrado",
  }
);
User.hasMany(maestroBorrado, {foreignKey: "Uid",as: "maestroBorrado"});
maestroBorrado.belongsTo(User, {foreignKey: "Uid",as: "usuarios"});
