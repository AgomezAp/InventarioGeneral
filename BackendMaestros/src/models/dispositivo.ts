import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection.js';
import { User } from './user.js';

/**
 * Modelo Dispositivo - Inventario principal de equipos
 * Estados: disponible, reservado, entregado, dañado, perdido, obsoleto
 */
export class Dispositivo extends Model {
  public id!: number;
  public nombre!: string;
  public categoria!: string; // celular, tablet, computador, cargador, otro
  public marca!: string;
  public modelo!: string;
  public serial!: string;
  public imei!: string; // Solo para celulares/tablets
  public color!: string;
  public descripcion!: string;
  public estado!: string; // disponible, reservado, entregado, dañado, perdido, obsoleto
  public condicion!: string; // nuevo, bueno, regular, malo
  public ubicacion!: string; // Almacén o ubicación física
  public fotos!: string; // JSON array de URLs
  public fechaIngreso!: Date;
  public observaciones!: string;
  public Uid!: number; // Usuario que registró
  
  // Campos para manejo de stock (accesorios, cargadores, etc.)
  public tipoRegistro!: string; // 'individual' o 'stock'
  public stockActual!: number; // Cantidad disponible para items de stock
  public stockMinimo!: number; // Alerta de stock bajo
}

Dispositivo.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nombre identificador del dispositivo'
    },
    categoria: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Tipo: celular, tablet, computador, cargador, accesorio, otro'
    },
    marca: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    modelo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    serial: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      comment: 'Número de serie único'
    },
    imei: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'IMEI para celulares y tablets'
    },
    color: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción detallada del dispositivo'
    },
    estado: {
      type: DataTypes.ENUM('disponible', 'reservado', 'entregado', 'dañado', 'perdido', 'obsoleto'),
      defaultValue: 'disponible',
      comment: 'Estado actual del dispositivo en el inventario'
    },
    condicion: {
      type: DataTypes.ENUM('nuevo', 'bueno', 'regular', 'malo'),
      defaultValue: 'bueno',
      comment: 'Condición física del dispositivo'
    },
    ubicacion: {
      type: DataTypes.STRING,
      defaultValue: 'Almacén Principal',
      comment: 'Ubicación física del dispositivo'
    },
    fotos: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      comment: 'JSON array con URLs de fotos del dispositivo'
    },
    fechaIngreso: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW,
      comment: 'Fecha de ingreso al inventario'
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    Uid: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Usuario que registró el dispositivo'
    },
    tipoRegistro: {
      type: DataTypes.ENUM('individual', 'stock'),
      defaultValue: 'individual',
      comment: 'individual: con serial único (celulares, laptops), stock: por cantidad (cargadores, accesorios)'
    },
    stockActual: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: 'Cantidad actual en stock (solo para tipoRegistro=stock)'
    },
    stockMinimo: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Stock mínimo para alertas (solo para tipoRegistro=stock)'
    }
  },
  {
    sequelize,
    modelName: 'Dispositivo',
    tableName: 'dispositivos',
    timestamps: true,
  }
);

// Relación con Usuario
User.hasMany(Dispositivo, { foreignKey: 'Uid', as: 'dispositivos' });
Dispositivo.belongsTo(User, { foreignKey: 'Uid', as: 'usuario' });
