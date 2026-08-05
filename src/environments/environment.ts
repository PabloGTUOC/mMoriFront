/**
 * Production configuration. `environment.development.ts` replaces this file for development
 * builds — see the `fileReplacements` entry in angular.json.
 *
 * Until that replacement existed, this file was the *only* environment ever compiled, which
 * is why it carried `production: true` alongside a localhost API URL.
 *
 * TODO: set `apiUrl` to the deployed backend before shipping a production build. Pointing a
 * production bundle at localhost fails for every user who is not the developer, and would be
 * blocked as mixed content when the app is served over HTTPS.
 */
export const environment = {
  production: true,
  apiUrl: 'http://localhost:3000',
  firebaseConfig: {
    apiKey: 'AIzaSyCBnQopJi6iYRv3cjZ_ponL3Xsa6WaeZCg',
    authDomain: 'trainingapp-44fb4.firebaseapp.com',
    projectId: 'trainingapp-44fb4',
    storageBucket: 'trainingapp-44fb4.appspot.com',
    messagingSenderId: '59926598301',
    appId: '1:59926598301:web:f8cec75e7754b468d97a74',
    measurementId: 'G-FRLECR0X3C',
  },
};
