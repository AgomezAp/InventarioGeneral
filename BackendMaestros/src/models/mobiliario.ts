import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection.js';
import { User } from './user.js';

/**
 * Modelo Mobiliario - Inventario de muebles de oficina
 * Estados: disponible, asignado, dañado, dado_de_baja
 */
export class Mobiliario extends Model {
  public id!: number;
  public nombre!: string;
  public categoria!: string; // escritorio, silla, mesa, archivador, estante, otro
  public marca!: string;
  public dimensiones!: string; // "120x60x75 cm"
  public material!: string; // madera, metal, plástico, mixto
  public color!: string;
  public descripcion!: string;
  public estado!: string; // disponible, asignado, dañado, dado_de_baja
  public condicion!: string; // nuevo, bueno, regular, malo
  public ubicacion!: string; // Oficina 201, Sala de Juntas, etc.
  public area!: string; // Área o departamento
  public fotos!: string; // JSON array de URLs
  public fechaIngreso!: Date;
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
      comment: 'Nombre identificador del mueble'
    },
    categoria: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Tipo: escritorio, silla, mesa, archivador, estante, otro'
    },
    marca: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dimensiones: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Dimensiones en formato LxAxA cm'
    },
    material: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Material principal: madera, metal, plástico, mixto'
    },
    color: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción detallada del mueble'
    },
    estado: {
      type: DataTypes.ENUM('disponible', 'asignado', 'dañado', 'dado_de_baja'),
      defaultValue: 'disponible',
      comment: 'Estado actual del mueble en el inventario'
    },
    condicion: {
      type: DataTypes.ENUM('nuevo', 'bueno', 'regular', 'malo'),
      defaultValue: 'bueno',
      comment: 'Condición física del mueble'
    },
    ubicacion: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Ubicación física: Oficina 201, Sala de Juntas, etc.'
    },
    area: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Área o departamento donde está asignado'
    },
    fotos: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      comment: 'JSON array con URLs de fotos del mueble'
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
      comment: 'Usuario que registró el mueble'
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
