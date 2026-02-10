import { Component } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { NavbarComponent } from './components/navbar/navbar.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,NavbarComponent,CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'Maestros Web';
  showNavbar: boolean = true;
  private routesWithoutNavbar: string[] = [
    '/login',
    '/signup',
    '/reestablecerContraseña',
    '/reset-password',
    '/',

  ];

  constructor(private router: Router) {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.showNavbar = !this.routesWithoutNavbar.some((route) =>
          event.urlAfterRedirects.startsWith(route),
        );
      });
  }
}
