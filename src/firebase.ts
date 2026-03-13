// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB48UEg6j2rz9_OUQVJpm_OzobQ1dQwq1E",
  authDomain: "examflow-tracker.firebaseapp.com",
  projectId: "examflow-tracker",
  storageBucket: "examflow-tracker.firebasestorage.app",
  messagingSenderId: "772292188753",
  appId: "1:772292188753:web:4a8cac966aa0e364db7670",
  measurementId: "G-B82VS03P9J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export default app;
