import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import firebase from 'firebase/compat/app';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private afAuth: AngularFireAuth) { }

  googleSignIn(): Promise<firebase.auth.UserCredential | void> {
    const provider = new firebase.auth.GoogleAuthProvider();
    return this.afAuth.signInWithPopup(provider)
      .then(result => {
        return result;
      })
      .catch(error => {
        console.error('Auth Service: Google sign in failed', error);
      });
  }

  signOut(): Promise<void> {
    return this.afAuth.signOut()
      .catch(error => {
        console.error('Auth Service: Sign out failed', error);
      });
  }
}
