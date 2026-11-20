// ===== دامەزراندنی هاوبەشی Firebase (هەموو پەڕەکان ئەمە import دەکەن) =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyCuf_6tebOLgddWUsWjuz-QAY5zCRQDhxc",
  authDomain: "smart-attendance-system-db51a.firebaseapp.com",
  // دەبێت لە Firebase Console ← Realtime Database ڕاستەکەی بپشکنیت (ئەگەر ناوچەکەی جیاوازە بیگۆڕە)
  databaseURL: "https://smart-attendance-system-db51a-default-rtdb.firebaseio.com",
  projectId: "smart-attendance-system-db51a",
  storageBucket: "smart-attendance-system-db51a.firebasestorage.app",
  messagingSenderId: "293108861060",
  appId: "1:293108861060:web:81bb85441108c08e6b1ad1",
  measurementId: "G-WJSJ7DBQE0"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);

// Analytics (بێ هەڵە ئەگەر وێبگەڕەکە پشتگیری نەکات)
isSupported().then(ok => { if (ok) getAnalytics(app); }).catch(() => {});
