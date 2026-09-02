import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for Auth0 to finish restoring session
  while (authService.isLoading()) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  // Not logged in
  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  // Logged in but not admin
  if (!authService.hasRole('Admin')) {
    return router.createUrlTree(['/unauthorized']);
  }

  return true;
};
