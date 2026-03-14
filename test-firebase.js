import { initializeApp } from "firebase/app";
import { getFirestore, collection, setDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB48UEg6j2rz9_OUQVJpm_OzobQ1dQwq1E",
  projectId: "examflow-tracker",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  try {
    console.log("Writing test doc...");
    await setDoc(doc(db, "test_collection", "test_id"), { test: 123 });
    console.log("Successfully wrote test doc!");
  } catch (error) {
    console.error("Failed to write to Firestore:", error);
  }
  process.exit(0);
}

run();
