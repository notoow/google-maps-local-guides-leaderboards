/**
 * 신고 서비스
 * 의심 사용자 신고 및 관리
 */

import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { db } from '../config/firebase.js';

const REPORTS_COLLECTION = 'reports';

// 신고 사유 상수
export const REPORT_REASONS = {
  DATA_MANIPULATION: { value: 'data_manipulation', label: '데이터 조작 의심' },
  FAKE_SCREENSHOT: { value: 'fake_screenshot', label: '스크린샷 위조' },
  DUPLICATE_ACCOUNT: { value: 'duplicate_account', label: '중복 계정' },
  OTHER: { value: 'other', label: '기타' }
};

/**
 * 신고 제출
 */
export async function submitReport(reporterId, reporterEmail, targetId, targetDisplayName, reason, detail) {
  try {
    const reportData = {
      reporterId,
      reporterEmail,
      targetId,
      targetDisplayName,
      reason,
      detail: detail || '',
      status: 'pending',
      action: null,
      reviewedBy: null,
      reviewNote: null,
      createdAt: serverTimestamp(),
      reviewedAt: null
    };

    const docRef = await addDoc(collection(db, REPORTS_COLLECTION), reportData);

    return { success: true, reportId: docRef.id };
  } catch (error) {
    console.error('신고 제출 실패:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 대기 중인 신고 목록 조회 (관리자용)
 */
export async function getPendingReports() {
  try {
    const q = query(
      collection(db, REPORTS_COLLECTION),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'asc')
    );

    const snapshot = await getDocs(q);
    const reports = [];

    snapshot.forEach((doc) => {
      reports.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, data: reports };
  } catch (error) {
    console.error('신고 목록 조회 실패:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * 모든 신고 목록 조회 (관리자용)
 */
export async function getAllReports() {
  try {
    const q = query(
      collection(db, REPORTS_COLLECTION),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const reports = [];

    snapshot.forEach((doc) => {
      reports.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, data: reports };
  } catch (error) {
    console.error('신고 목록 조회 실패:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * 신고 처리 (관리자용)
 */
export async function resolveReport(reportId, adminId, status, action, reviewNote) {
  try {
    const reportRef = doc(db, REPORTS_COLLECTION, reportId);

    await updateDoc(reportRef, {
      status, // 'resolved' or 'dismissed'
      action, // 'warning', 'data_removed', 'banned', or null
      reviewedBy: adminId,
      reviewNote: reviewNote || null,
      reviewedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('신고 처리 실패:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 특정 사용자에 대한 신고 횟수 조회
 */
export async function getReportCountForUser(targetId) {
  try {
    const q = query(
      collection(db, REPORTS_COLLECTION),
      where('targetId', '==', targetId),
      where('status', '==', 'resolved')
    );

    const snapshot = await getDocs(q);

    return { success: true, count: snapshot.size };
  } catch (error) {
    console.error('신고 횟수 조회 실패:', error);
    return { success: false, error: error.message, count: 0 };
  }
}
