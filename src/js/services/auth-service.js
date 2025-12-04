/**
 * 인증 서비스
 * Google 로그인/로그아웃 및 사용자 상태 관리
 */

import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { auth, googleProvider, db } from '../config/firebase.js';

// 현재 사용자 상태
let currentUser = null;
let isAdmin = false;

// 상태 변경 리스너들
const authListeners = [];

/**
 * Google 로그인
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // 가이드 문서 존재 여부 확인 및 생성
    await ensureGuideDocument(user);

    return { success: true, user };
  } catch (error) {
    console.error('로그인 실패:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 로그아웃
 */
export async function signOutUser() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('로그아웃 실패:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 가이드 문서 확인 및 생성
 */
async function ensureGuideDocument(user) {
  const guideRef = doc(db, 'guides', user.uid);
  const guideSnap = await getDoc(guideRef);

  if (!guideSnap.exists()) {
    // 새 사용자 - 기본 문서 생성 (pending 상태)
    await setDoc(guideRef, {
      odLxTydGbcKN2: user.uid,
      odLxTydGbcKN2: user.email,
      displayName: user.displayName || user.email.split('@')[0],
      avatarUrl: user.photoURL || null,
      mapsProfileUrl: '',
      country: '',
      level: 1,
      points: 0,
      photoCount: 0,
      photoViews: 0,
      videoViews: 0,
      reviewCount: 0,
      starPhoto: null,
      status: 'pending',
      isGoogler: false,
      isModerator: false,
      joinedThisMonth: true,
      leveledUpThisMonth: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } else {
    // 기존 사용자 - 아바타 업데이트
    await updateDoc(guideRef, {
      avatarUrl: user.photoURL || null,
      updatedAt: serverTimestamp()
    });
  }
}

/**
 * 관리자 여부 확인
 */
async function checkAdminStatus(uid) {
  try {
    const adminRef = doc(db, 'admins', uid);
    const adminSnap = await getDoc(adminRef);
    return adminSnap.exists();
  } catch (error) {
    console.error('관리자 확인 실패:', error);
    return false;
  }
}

/**
 * 인증 상태 변경 감지
 */
export function initAuthListener() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      };
      isAdmin = await checkAdminStatus(user.uid);
    } else {
      currentUser = null;
      isAdmin = false;
    }

    // 모든 리스너에게 알림
    authListeners.forEach(listener => listener(currentUser, isAdmin));
  });
}

/**
 * 인증 상태 변경 리스너 등록
 */
export function onAuthChange(callback) {
  authListeners.push(callback);
  // 현재 상태 즉시 전달
  callback(currentUser, isAdmin);

  // 구독 해제 함수 반환
  return () => {
    const index = authListeners.indexOf(callback);
    if (index > -1) {
      authListeners.splice(index, 1);
    }
  };
}

/**
 * 현재 사용자 가져오기
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * 관리자 여부 가져오기
 */
export function getIsAdmin() {
  return isAdmin;
}
