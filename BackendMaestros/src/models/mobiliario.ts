import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection.js';
import { User } from './user.js';

/**
 * Modelo Mobiliario - Inventario de muebles de oficina CON STOCK
 * Similar a consumibles - maneja cantidades, no items individuales
 */
export class Mobiliario extends Model {
  public id!: number;
  public nombre!: string;
  public categoria!: string; // escritorio, silla, mesa, archivador, estante, otro
  public descripcion!: string;
  public unidadMedida!: string; // unidad, juego, etc.
  public stockActual!: number;
  public ubicacionAlmacen!: string; // Donde se guarda
  public proveedor!: string;
  public precioUnitario!: number;
  public foto!: string;
  public activo!: boolean;
  public observaciones!: string;
  public Uid!: number; // Usuario que registró
}

Mobiliario.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nombre del mobiliario (ej: Silla ejecutiva, Escritorio tipo L)'
    },
    categoria: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Tipo: escritorio, silla, mesa, archivador, estante, otro'
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción del mobiliario'
    },
    unidadMedida: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'unidad',
      comment: 'Unidad de medida: unidad, juego, par'
    },
    stockActual: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Cantidad actual en inventario'
    },
    ubicacionAlmacen: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Ubicación de almacenamiento'
    },
    proveedor: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Proveedor del mobiliario'
    },
    precioUnitario: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      comment: 'Precio por unidad'
    },
    foto: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'URL de foto del mobiliario'
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si el producto sigue activo en el inventario'
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    Uid: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Usuario que registró'
    }
  },
  {
    sequelize,
    tableName: 'mobiliario',
    timestamps: true,
  }
);

// Relación con User
Mobiliario.belongsTo(User, { foreignKey: 'Uid', as: 'registradoPor' });
