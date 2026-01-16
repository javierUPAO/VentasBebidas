import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { FirebaseAuthService } from './firebase-auth.service';

@Injectable({ providedIn: 'root' })
export class LoginGuard implements CanActivate {
  constructor(private auth: FirebaseAuthService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.auth.authState$().pipe(
      filter((v) => v !== null),
      take(1),
      map((isLogged) => {
        if (isLogged) {
          this.router.navigate(['/tablero']);
          return false;
        }
        return true;
      })
    );
  }
}
