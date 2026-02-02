import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ToastrService } from 'ngx-toastr';

import { User } from '../../interfaces/user';
import { ErrorsService } from '../../services/errors.service';
import { UserService } from '../../services/user.service';
import {
  SpinnerComponent,
} from '../../shared/spinner/spinner/spinner.component';

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule, SpinnerComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  nombre: string = '';
  apellido: string = '';
  correo: string = '';
  contrasena: string = '';
  repetirContrasena: string = '';
  loading: boolean = false;
  constructor( private toastr: ToastrService,
    private userService: UserService,
    private router: Router,
    private errorService : ErrorsService) {}

    agregarUsuario() {
      if (
        this.nombre == '' ||
        this.apellido == '' ||
        this.correo == '' ||
        this.contrasena == '' ||
        this.repetirContrasena == ''
      ) {
        this.toastr.error('todos los campos son obligatorios', 'Error');
       
        return;
      }
      if (this.contrasena != this.repetirContrasena) {
        this.toastr.warning('Las contraseñas no coinciden', 'Advertencia');
        return 
      }
  
      //Creación Objeto
  
      const user: User = {
        nombre: this.nombre,
        apellido: this.apellido,
        correo: this.correo,
        contrasena: this.contrasena,

      };
      this.loading = true;
      this.userService.signIn(user).subscribe({
        next: (v) => {
          this.loading = false;
  
          this.toastr.success(`${this.nombre}${this.apellido} creado exitosamente`);
          this.router.navigate(['/logIn']);
        },
        error: (e:HttpErrorResponse) => { 
            this.errorService.messageError(e)
  
          },
        complete: () => console.info('complete') 
      })
      
    }
}
