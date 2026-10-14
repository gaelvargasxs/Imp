/*
  CONFIGURACIÓN DE FIREBASE
  -------------------------
  Mientras "apiKey" empiece con "TU_", la app funciona en MODO DEMO
  (datos guardados en el navegador, con usuarios de prueba).

  Para usar Firebase real:
  1. Firebase Console > Configuración del proyecto > Tus apps > Web (</>)
  2. Copia los valores y reemplaza los de abajo.
  3. Activa Authentication (correo/contraseña) y Firestore.
  Más detalles en README.md
*/
const FIREBASE_CONFIG = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "000000000000",
  appId: "TU_APP_ID"
};
