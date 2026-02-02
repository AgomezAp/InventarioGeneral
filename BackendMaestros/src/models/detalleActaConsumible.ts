import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection.js';
import { ActaConsumible } from './actaConsumible.js';
import { Consumible } from './consumible.js';

/**
 * Modelo DetalleActaConsumible - Detalle de cada artículo en un acta de entrega
 * Registra qué cantidad de cada consumible se entregó
 */
export class DetalleActaConsumible extends Model {
  public id!: number;
  public actaConsumibleId!: number;
  public consumibleId!: number;
  public cantidad!: number; // Cantidad entregada
  public unidadMedida!: string; // Unidad de medida al momento de la entrega
  public observaciones!: string;
  public consumible?: Consumible;
}

DetalleActaConsumible.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    actaConsumibleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'actas_consumibles',
        key: 'id'
      },
      comment: 'FK al acta de consumibles'
    },
    consumibleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'consumibles',
        key: 'id'
      },
      comment: 'FK al consumible'
    },
    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Cantidad entregada'
    },
    unidadMedida: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'unidad',
      comment: 'Unidad de medida al momento de entrega'
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Observaciones específicas del artículo'
    }
  },
  {
    sequelize,
    tableName: 'detalles_acta_consumibles',
    timestamps: true,
  }
);

// Relaciones
DetalleActaConsumible.belongsTo(ActaConsumible, { foreignKey: 'actaConsumibleId', as: 'acta' });
DetalleActaConsumible.belongsTo(Consumible, { foreignKey: 'consumibleId', as: 'consumible' });
ActaConsumible.hasMany(DetalleActaConsumible, { foreignKey: 'actaConsumibleId', as: 'detalles' });

export default DetalleActaConsumible;
