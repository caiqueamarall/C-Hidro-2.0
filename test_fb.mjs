import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSy" + "Dge5RGUj7qu18igthplx-I10mnBexIPOg",
  authDomain: "c-hidro-2.firebaseapp.com",
  projectId: "c-hidro-2",
  storageBucket: "c-hidro-2.firebasestorage.app",
  messagingSenderId: "714494919598",
  appId: "1:714494919598:web:47e3da97c42e6c6725fe3f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkFirebase() {
    console.log("Querying Firebase...");
    const q = query(collection(db, "stations"), limit(2));
    const snapshot = await getDocs(q);
    
    snapshot.forEach((doc) => {
        console.log(doc.id, "=>", doc.data());
    });
    console.log("Done.");
}

checkFirebase().catch(console.error);
