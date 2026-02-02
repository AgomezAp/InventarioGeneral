import {
  DataTypes,
  Model,
} from 'sequelize';

import sequelize from '../database/connection.js';

export class Analista extends Model {
  public Aid!: number;
  public nombre!: string;
  public apellido!: string;
  public cedula!: string;
  public telefono!: string;
  public correo!: string;
  public cargo!: string;
  public activo!: boolean;
}

Analista.init(
  {
    Aid: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    apellido: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cedula: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    telefono: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    correo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    cargo: {
      type: DataTypes.STRING,
      defaultValue: 'Analista',
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: 'Analista',
    tableName: 'analistas',
    timestamps: false,
  }
);
