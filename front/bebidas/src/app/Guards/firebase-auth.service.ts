import { Injectable } from '@angular/core';
import firebase from 'firebase/app';
import 'firebase/auth';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FirebaseAuthService {
  private loggedIn$ = new BehaviorSubject<boolean | null>(null);

  constructor() {
    if (!firebase.apps.length) {
      firebase.initializeApp(environment.firebase);
    }

    firebase.auth().onAuthStateChanged((user) => {
      this.loggedIn$.next(!!user);
    });
  }

  login(email: string, password: string) {
    return firebase.auth().signInWithEmailAndPassword(email, password);
  }

  logout() {
    return firebase.auth().signOut();
  }

  authState$() {
    return this.loggedIn$.asObservable();
  }
}
