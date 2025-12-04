/**
 * 제출 서비스
 * 가이드 데이터 제출 및 관리
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

const SUBMISSIONS_COLLECTION = 'submissions';
const GUIDES_COLLECTION = 'guides';

/**
 * 데이터 제출 (신규 등록 또는 업데이트)
 */
export async function submitGuideData(userId, userEmail, data, screenshotUrl) {
  try {
    const submissionData = {
      userId,
      userEmail,
      type: data.isUpdate ? 'update' : 'new',
      data: {
        displayName: data.displayName,
        mapsProfileUrl: data.mapsProfileUrl,
        country: data.country,
        level: Number(data.level),
        points: Number(data.points),
        photoCount: Number(data.photoCount) || 0,
        photoViews: Number(data.photoViews) || 0,
        videoViews: Number(data.videoViews) || 0,
        reviewCount: Number(data.reviewCount) || 0,
        starPhoto: data.starPhoto || null
      },
      screenshotUrl,
      mapsProfileUrl: data.mapsProfileUrl,
      status: 'pending',
      reviewedBy: null,
      reviewedAt: null,
      rejectReason: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, SUBMISSIONS_COLLECTION), submissionData);

    return { success: true, submissionId: docRef.id };
  } catch (error) {
    console.error('데이터 제출 실패:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 내 제출 내역 조회
 */
export async function getMySubmissions(userId) {
  try {
    const q = query(
      collection(db, SUBMISSIONS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const submissions = [];

    snapshot.forEach((doc) => {
      submissions.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, data: submissions };
  } catch (error) {
    console.error('제출 내역 조회 실패:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * 대기 중인 제출 목록 조회 (관리자용)
 */
export async function getPendingSubmissions() {
  try {
    const q = query(
      collection(db, SUBMISSIONS_COLLECTION),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'asc')
    );

    const snapshot = await getDocs(q);
    const submissions = [];

    snapshot.forEach((doc) => {
      submissions.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, data: submissions };
  } catch (error) {
    console.error('대기 제출 조회 실패:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * 제출 승인 (관리자용)
 */
export async function approveSubmission(submissionId, adminId) {
  try {
    const submissionRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
    const submissionSnap = await getDocs(query(
      collection(db, SUBMISSIONS_COLLECTION),
      where('__name__', '==', submissionId)
    ));

    if (submissionSnap.empty) {
      return { success: false, error: '제출을 찾을 수 없습니다.' };
    }

    const submission = submissionSnap.docs[0].data();

    // 제출 상태 업데이트
    await updateDoc(submissionRef, {
      status: 'approved',
      reviewedBy: adminId,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // 가이드 문서 업데이트
    const guideRef = doc(db, GUIDES_COLLECTION, submission.userId);

    // 계산 지표 추가
    const data = submission.data;
    const avgViewsPerPhoto = data.photoCount > 0
      ? Math.round(data.photoViews / data.photoCount)
      : 0;

    await updateDoc(guideRef, {
      ...data,
      avgViewsPerPhoto,
      status: 'approved',
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('제출 승인 실패:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 제출 거부 (관리자용)
 */
export async function rejectSubmission(submissionId, adminId, reason) {
  try {
    const submissionRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);

    await updateDoc(submissionRef, {
      status: 'rejected',
      reviewedBy: adminId,
      reviewedAt: serverTimestamp(),
      rejectReason: reason,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('제출 거부 실패:', error);
    return { success: false, error: error.message };
  }
}
