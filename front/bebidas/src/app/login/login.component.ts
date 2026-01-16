import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseAuthService } from '../Guards/firebase-auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;
  error = '';

  constructor(private auth: FirebaseAuthService, private router: Router) {}

  login() {
    this.error = '';
    this.loading = true;

    this.auth
      .login(this.email, this.password)
      .then(() => {
        this.router.navigate(['/tablero']);
      })
      .catch((err) => {
        this.error = err.message;
      })
      .finally(() => {
        this.loading = false;
      });
  }
}
