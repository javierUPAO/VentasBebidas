import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { FirebaseAuthService } from './firebase-auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: FirebaseAuthService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.auth.authState$().pipe(
      filter((v) => v !== null), // espera a Firebase
      take(1),
      map((isLogged) => {
        if (isLogged) return true;
        this.router.navigate(['/login']);
        return false;
      })
    );
  }
}
