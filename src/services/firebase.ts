import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSy" + "Dge5RGUj7qu18igthplx-I10mnBexIPOg",
  authDomain: "c-hidro-2.firebaseapp.com",
  projectId: "c-hidro-2",
  storageBucket: "c-hidro-2.firebasestorage.app",
  messagingSenderId: "714494919598",
  appId: "1:714494919598:web:47e3da97c42e6c6725fe3f",
  measurementId: "G-7XTF0X17H8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firestore instance
export const db = getFirestore(app);
