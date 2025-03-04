import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCXM8a85xfNETdPYdCnGKxWIh0Icm0j9y8",
  authDomain: "kumeet-ai.firebaseapp.com",
  projectId: "kumeet-ai",
  storageBucket: "kumeet-ai.firebasestorage.app",
  messagingSenderId: "63336651860",
  appId: "1:63336651860:web:e8d4afd4c5f212e616a1c1",
  measurementId: "G-9W20CQXK2N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth }; 