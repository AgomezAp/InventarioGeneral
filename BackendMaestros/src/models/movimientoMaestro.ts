import {
  DataTypes,
  Model,
} from 'sequelize';

import sequelize from '../database/connection.js';

export class MovimientoMaestro extends Model {
  public MMid!: number;
  public Mid!: number;
  public tipoMovimiento!: string;
  public fechaMovimiento!: Date;
}

MovimientoMaestro.init(
  {
    MMid: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    Mid: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    tipoMovimiento: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fechaMovimiento: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'MovimientoMaestro',
    timestamps: false,
  }
);