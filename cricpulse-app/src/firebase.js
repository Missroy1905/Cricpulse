// cricpulse-app/src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore }  from "firebase/firestore";
import { getDatabase }   from "firebase/database";

const firebaseConfig = {
  apiKey:            "AIzaSyFakeKey_For_Hackathon_Direct_Read", 
  authDomain:        "cricpulse-496702.firebaseapp.com",
  databaseURL:       "https://cricpulse-496702-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "cricpulse-496702",
  storageBucket:     "cricpulse-496702.appspot.com",
};

const app = initializeApp(firebaseConfig);

export const db  = getFirestore(app);  
export const rdb = getDatabase(app);