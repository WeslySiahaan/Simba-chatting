import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage'; // Added for image uploads

const firebaseConfig = {
  apiKey: "AIzaSyCRcjWFwTAfa1Ty92DGqNdfxQ3LHeGZB-U",
  authDomain: "partisi-chat.firebaseapp.com",
  projectId: "partisi-chat",
  storageBucket: "partisi-chat.firebasestorage.app",
  messagingSenderId: "460345399304",
  appId: "1:460345399304:web:43f62d2a6c8cc606fcd9bd",
  measurementId: "G-4REX8SP3KZ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app); // Export storage