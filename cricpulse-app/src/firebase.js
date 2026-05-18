// cricpulse-app/src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "cricpulse-496702"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);