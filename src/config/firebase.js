// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyCOpVLxfmJ5wG4BPHj_JWjlGZj4dOfkum8",
  authDomain: "soen341-5e47f.firebaseapp.com",
  projectId: "soen341-5e47f",
  storageBucket: "soen341-5e47f.firebasestorage.app",
  messagingSenderId: "646434903420",
  appId: "1:646434903420:web:8f554309476d629f14c0f9",
  measurementId: "G-TCZE9WQ4CD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };
