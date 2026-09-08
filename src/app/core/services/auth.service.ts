// import { Injectable, inject } from '@angular/core';
// import { AuthService as Auth0Service } from '@auth0/auth0-angular';
// import { toSignal } from '@angular/core/rxjs-interop';

// @Injectable({
//   providedIn: 'root',
// })
// export class AuthService {
//   private auth0 = inject(Auth0Service);

//   readonly isAuthenticated = toSignal(this.auth0.isAuthenticated$, { initialValue: false });
//   readonly user = toSignal(this.auth0.user$, { initialValue: null });
//   readonly isLoading = toSignal(this.auth0.isLoading$, { initialValue: true });

//   login(): void {
//     this.auth0.loginWithRedirect({
//       appState: { target: '/home' },
//     });
//   }

//   logout(): void {
//     sessionStorage.clear();
//     localStorage.clear();
    
//     this.auth0.logout({
//       logoutParams: {
//         returnTo: window.location.origin,
//       },
//     });

//   }

//   getAccessToken() {
//     return this.auth0.getAccessTokenSilently();
//   }

//   hasRole(role: string): boolean {
//     const currentUser = this.user();

//     const roles = (currentUser?.['https://angular-app.com/roles'] as string[]) ?? [];
//     //console.log('Current User Roles:', roles);
//     return roles.includes(role);
//   }

//   hasAnyRole(roles: string[]): boolean {
//     const currentUser = this.user();

//     const userRoles = (currentUser?.['https://angular-app.com/roles'] as string[]) ?? [];
//     //console.log('Current User Roles:', userRoles);
//     return roles.some((role) => userRoles.includes(role));
//   }
// }




import { Injectable, inject } from '@angular/core';
import { AuthService as Auth0Service } from '@auth0/auth0-angular';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth0 = inject(Auth0Service);
  private http = inject(HttpClient);

  private auth0Domain = environment.auth0.domain;
  private clientId = environment.auth0.clientId;

  readonly isAuthenticated = toSignal(this.auth0.isAuthenticated$, { initialValue: false });
  readonly user = toSignal(this.auth0.user$, { initialValue: null });
  readonly isLoading = toSignal(this.auth0.isLoading$, { initialValue: true });

  login(): void {
    this.auth0.loginWithRedirect({
      appState: { target: '/home' },
    });
  }

  logout(): void {
    sessionStorage.clear();
    localStorage.clear();
    
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
    return roles.includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    const currentUser = this.user();
    const userRoles = (currentUser?.['https://angular-app.com/roles'] as string[]) ?? [];
    return roles.some((role) => userRoles.includes(role));
  }

  // Auth0 Change Password Request
  sendPasswordResetEmail(email: string): Observable<any> {
    const url = `https://${this.auth0Domain}/dbconnections/change_password`;
    const body = {
      client_id: this.clientId,
      email: email,
      connection: 'Username-Password-Authentication' // Default Auth0 DB connection
    };

    return this.http.post(url, body, { responseType: 'text' });
  }
}