import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { MaestroService } from '../../services/maestro.service';
import {
  SpinnerComponent,
} from '../../shared/spinner/spinner/spinner.component';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-agregar-maestro',
  imports: [
    CommonModule,
    FormsModule,
    NavbarComponent,
    FontAwesomeModule,
  ],
  templateUrl: './agregar-maestro.component.html',
  styleUrl: './agregar-maestro.component.css',
})
export class AgregarMaestroComponent {
  celular: any = {
    nombre: '',
    marca: '',
    modelo: '',
    imei: '',
    tipo: '',
    estado: 'disponible',
    almacen: '302',
    stockMinimo: 1,
    descripcionEntrega: '',
    fechaIngreso: new Date(),
    Uid: localStorage.getItem('userId'),
  };
  
  almacenes: string[] = ['302', '204'];
  tipos: string[] = ['Smartphone', 'Tablet', 'Laptop', 'Desktop', 'Otro'];
  
  loading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(private maestroService: MaestroService, private router: Router) {}
  
  onSubmit(): void {
    this.loading = true;
    
    // Trim para eliminar espacios en blanco
    const nombre = (this.celular.nombre || '').toString().trim();
    const marca = (this.celular.marca || '').toString().trim();
    const modelo = (this.celular.modelo || '').toString().trim();
    const imei = (this.celular.imei || '').toString().trim();
    const tipo = (this.celular.tipo || '').toString().trim();
    
    if (!nombre || !marca || !modelo || !imei || !tipo) {
      this.errorMessage = 'Nombre del celular, marca, modelo, IMEI y tipo son obligatorios';
      this.loading = false;
      return;
    }

    // Actualizar celular con valores limpios
    this.celular.nombre = nombre;
    this.celular.marca = marca;
    this.celular.modelo = modelo;
    this.celular.imei = imei;

    this.maestroService.registrarMaestro(this.celular).subscribe(
      (response: any) => {
        this.successMessage = 'Celular agregado al inventario con éxito';
        this.errorMessage = '';
        this.limpiarFormulario();
        setTimeout(() => {
          this.router.navigate(['/consolidado-celulares']);
        }, 1500);
        this.loading = false;
      },
      (error: any) => {
        this.errorMessage = error.error.msg || 'Problemas al agregar el celular';
        this.successMessage = '';
        this.loading = false;
      }
    );
  }

  limpiarFormulario(): void {
    this.celular = {
      nombre: '',
      marca: '',
      modelo: '',
      imei: '',
      tipo: '',
      estado: 'disponible',
      almacen: 'Principal',
      stockMinimo: 1,
      descripcionEntrega: '',
      fechaIngreso: new Date(),
      Uid: localStorage.getItem('userId'),
    };
    this.errorMessage = '';
    this.successMessage = '';
  }

  navigateToDashboard(): void {
    this.router.navigate(['/consolidado-celulares']);
  }
}
