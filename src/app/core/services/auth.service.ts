import { Injectable, inject } from '@angular/core';
import { AuthService as Auth0Service } from '@auth0/auth0-angular';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth0 = inject(Auth0Service);

  readonly isAuthenticated = toSignal(this.auth0.isAuthenticated$, { initialValue: false });
  readonly user = toSignal(this.auth0.user$, { initialValue: null });
  readonly isLoading = toSignal(this.auth0.isLoading$, { initialValue: true });

  login(): void {
    this.auth0.loginWithRedirect({
      appState: { target: '/home' },
    });
  }

  logout(): void {
    this.auth0.logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  }

  getAccessToken() {
    return this.auth0.getAccessTokenSilently();
  }

  hasRole(role: string): boolean {
    const currentUser = this.user();

    const roles = (currentUser?.['https://angular-app.com/roles'] as string[]) ?? [];
    console.log('Current User Roles:', roles);
    return roles.includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    const currentUser = this.user();

    const userRoles = (currentUser?.['https://angular-app.com/roles'] as string[]) ?? [];
    console.log('Current User Roles:', userRoles);
    return roles.some((role) => userRoles.includes(role));
  }
}
