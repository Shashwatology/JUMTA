import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCfgJb2lUVbF4KdCUql4FnzfPmrwm3LTm8",
  authDomain: "jumta-469e8.firebaseapp.com",
  projectId: "jumta-469e8",
  storageBucket: "jumta-469e8.firebasestorage.app",
  messagingSenderId: "1084580412747",
  appId: "1:1084580412747:web:134c1e605c6d4e16e43cce",
  measurementId: "G-PEW7HS044W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
