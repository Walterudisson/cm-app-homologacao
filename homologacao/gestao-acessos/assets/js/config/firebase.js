import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js";

const firebaseConfig = {
  apiKey: "AIzaSyAAfGMU10hc3TQlARLH5E23IJwsABKN0gA",
  authDomain: "cm-app-homologacao.firebaseapp.com",
  projectId: "cm-app-homologacao",
  storageBucket: "cm-app-homologacao.firebasestorage.app",
  messagingSenderId: "309646669451",
  appId: "1:309646669451:web:38bf2c5e7b86bb3e6cc68e"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, "southamerica-east1");
