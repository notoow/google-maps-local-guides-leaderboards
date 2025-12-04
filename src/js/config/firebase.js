/**
 * Firebase 초기화 설정
 *
 * GitHub Pages에서는 환경변수를 사용할 수 없으므로
 * Firebase config를 직접 포함합니다.
 * (Firebase API Key는 클라이언트용이라 노출되어도 괜찮음 - Security Rules로 보호)
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyCfIvC9UyprcF1xzUetwVhcs8T6_-GPeXY",
  authDomain: "local-guides-leaderboard.firebaseapp.com",
  projectId: "local-guides-leaderboard",
  storageBucket: "local-guides-leaderboard.firebasestorage.app",
  messagingSenderId: "187924461688",
  appId: "1:187924461688:web:10397491463b0d54b6158d",
  measurementId: "G-CYV67FW87T"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Auth 초기화
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Firestore 초기화
export const db = getFirestore(app);

export default app;
