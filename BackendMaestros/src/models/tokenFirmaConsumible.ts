import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection.js';
import { ActaConsumible } from './actaConsumible.js';

/**
 * Token único para firmar actas de consumibles por correo
 */
export class TokenFirmaConsumible extends Model {
  public id!: number;
  public actaConsumibleId!: number;
  public token!: string;
  public usado!: boolean;
  public fechaExpiracion!: Date;
  public acta?: ActaConsumible;
}

TokenFirmaConsumible.init(
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
    token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      comment: 'Token único para firmar'
    },
    usado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si el token ya fue usado'
    },
    fechaExpiracion: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Fecha de expiración del token'
    }
  },
  {
    sequelize,
    tableName: 'tokens_firma_consumibles',
    timestamps: true,
  }
);

// Relaciones
TokenFirmaConsumible.belongsTo(ActaConsumible, { foreignKey: 'actaConsumibleId', as: 'acta' });
ActaConsumible.hasOne(TokenFirmaConsumible, { foreignKey: 'actaConsumibleId', as: 'tokenFirma' });

export default TokenFirmaConsumible;
