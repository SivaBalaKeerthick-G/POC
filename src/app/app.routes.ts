import { Routes } from '@angular/router';
import { authGuardFn } from '@auth0/auth0-angular';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },

  {
    path: 'login',
    loadComponent: () => import('./components/login/login').then((m) => m.Login),
  },

  {
    path: 'home',
    loadComponent: () => import('./components/home/home').then((m) => m.Home),
    canActivate: [authGuardFn],//buit-in guard by Auth0 to check for authentication
  },
  
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard').then((m) => m.Dashboard),
    canActivate: [authGuard], //custom guard to check for Admin role
  },

  {
    path: 'about',
    loadComponent: () => import('./components/about/about').then((m) => m.About),
    canActivate: [authGuardFn],
  },

  {
    path: 'contact',
    loadComponent: () => import('./components/contact/contact').then((m) => m.Contact),
    canActivate: [authGuardFn],
  },

  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./components/unauthorized/unauthorized').then((m) => m.Unauthorized),
  },

  {
    path: '**',
    redirectTo: 'page-not-found',
    pathMatch: 'full',
  },

  {
    path: '**',
    loadComponent: () =>
      import('./components/page-not-found/page-not-found').then((m) => m.PageNotFound),
  },
];
