import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDFWkaCLFB9W23WVBlNHwioHf-PmhvdNZA",
  authDomain: "studynova-a39bf.firebaseapp.com",
  projectId: "studynova-a39bf",
  storageBucket: "studynova-a39bf.firebasestorage.app",
  messagingSenderId: "216487329615",
  appId: "1:216487329615:web:05274f6d830363da234f3a",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();