import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Router,
  RouterLink,
} from '@angular/router';

import { ToastrService } from 'ngx-toastr';

import { UserService } from '../../services/user.service';
import {
  SpinnerComponent,
} from '../../shared/spinner/spinner/spinner.component';

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule,FormsModule,RouterLink,SpinnerComponent],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent {
  correo: string = '';
  nuevaContrasena: string = '';
  confirmarContrasena: string = '';
  loading: boolean = false;

  constructor(private userService: UserService, private toastr: ToastrService, private router: Router) {}

  onSubmit(): void {
    if (this.nuevaContrasena !== this.confirmarContrasena) {
      this.toastr.error('Las contraseñas no coinciden', 'Error');
      return;
    }

    this.loading = true;
    this.userService.resetPassword({ correo: this.correo, nuevaContrasena: this.nuevaContrasena }).subscribe({
      next: () => {
        this.loading = true;
        this.toastr.success('Contraseña restablecida con éxito', 'Éxito');
        this.router.navigate(['/logIn']);
      },
      error: (error) => {
        this.loading = true;
        if (error.status === 404) {
          this.toastr.error('El correo electrónico no existe', 'Error');
        } else {
          this.toastr.error('Error al restablecer la contraseña', 'Error');
        }
      }
    });
  }
}