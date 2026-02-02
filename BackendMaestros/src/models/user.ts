import {
  DataTypes,
  Model,
} from 'sequelize';

import sequelize from '../database/connection.js';
import { Maestro } from './maestros.js';

export class User extends Model {
  public Uid!: number;

  public nombre!: string;

  public apellido!: string;

  public correo!: string;

  public contrasena!: string;
  public maestros?: Maestro[];
}
User.init(
  {
    Uid: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING,
    },
    apellido: {
      type: DataTypes.STRING,
    },
    correo: {
      type: DataTypes.STRING,
    },
    contrasena: {
      type: DataTypes.STRING,
    },
  },
  {
    sequelize,
    tableName: "users",
    timestamps: false,
  }
);
