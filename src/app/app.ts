import { Component, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Navbar } from './shared/nav-bar/nav-bar';
import { Footer } from './shared/footer/footer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,Navbar,Footer],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected router = inject(Router);
  protected readonly title = signal('frontend');
  hiddenNavbarRoutes = ['/login', '/unauthorized', '/page-not-found'];

  get showNavbar(): boolean {
    return !this.hiddenNavbarRoutes.some((route) => this.router.url.startsWith(route));
  }
}
