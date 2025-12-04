/**
 * 가이드 서비스
 * 리더보드 데이터 조회 및 관리
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { db } from '../config/firebase.js';

const GUIDES_COLLECTION = 'guides';

/**
 * 승인된 가이드 목록 조회 (리더보드용)
 * @param {Object} options - 조회 옵션
 * @param {string} options.sortBy - 정렬 기준 ('points', 'photoViews', 'level', 'avgViewsPerPhoto')
 * @param {number} options.filterLevel - 특정 레벨만 필터 (null이면 전체)
 * @param {number} options.limitCount - 조회 개수 (기본 100)
 */
export async function getApprovedGuides({
  sortBy = 'points',
  filterLevel = null,
  limitCount = 100
} = {}) {
  try {
    const guidesRef = collection(db, GUIDES_COLLECTION);

    let constraints = [
      where('status', '==', 'approved'),
      orderBy(sortBy, 'desc'),
      limit(limitCount)
    ];

    // 레벨 필터 추가
    if (filterLevel !== null) {
      constraints = [
        where('status', '==', 'approved'),
        where('level', '==', filterLevel),
        orderBy(sortBy, 'desc'),
        limit(limitCount)
      ];
    }

    const q = query(guidesRef, ...constraints);
    const snapshot = await getDocs(q);

    const guides = [];
    snapshot.forEach((doc) => {
      guides.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, data: guides };
  } catch (error) {
    console.error('가이드 목록 조회 실패:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * 특정 가이드 상세 조회
 */
export async function getGuideById(uid) {
  try {
    const guideRef = doc(db, GUIDES_COLLECTION, uid);
    const guideSnap = await getDoc(guideRef);

    if (!guideSnap.exists()) {
      return { success: false, error: '가이드를 찾을 수 없습니다.' };
    }

    return { success: true, data: { id: guideSnap.id, ...guideSnap.data() } };
  } catch (error) {
    console.error('가이드 조회 실패:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 내 가이드 정보 조회
 */
export async function getMyGuideInfo(uid) {
  return getGuideById(uid);
}

/**
 * 가이드 정보 업데이트 (본인만)
 */
export async function updateMyGuideInfo(uid, data) {
  try {
    const guideRef = doc(db, GUIDES_COLLECTION, uid);

    // 업데이트 불가 필드 제거
    const safeData = { ...data };
    delete safeData.uid;
    delete safeData.email;
    delete safeData.status;
    delete safeData.isGoogler;
    delete safeData.isModerator;
    delete safeData.createdAt;
    delete safeData.approvedAt;

    await updateDoc(guideRef, {
      ...safeData,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('가이드 정보 업데이트 실패:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 전체 통계 계산
 */
export async function getOverallStats() {
  try {
    const result = await getApprovedGuides({ limitCount: 1000 });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const guides = result.data;

    const stats = {
      totalGuides: guides.length,
      totalPoints: guides.reduce((sum, g) => sum + (g.points || 0), 0),
      totalReviews: guides.reduce((sum, g) => sum + (g.reviewCount || 0), 0),
      totalPhotos: guides.reduce((sum, g) => sum + (g.photoCount || 0), 0),
      totalPhotoViews: guides.reduce((sum, g) => sum + (g.photoViews || 0), 0)
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error('통계 계산 실패:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 검색
 */
export async function searchGuides(searchTerm) {
  try {
    // Firestore는 부분 문자열 검색을 지원하지 않으므로
    // 전체 조회 후 클라이언트에서 필터링
    const result = await getApprovedGuides({ limitCount: 500 });

    if (!result.success) {
      return result;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = result.data.filter(guide =>
      guide.displayName?.toLowerCase().includes(searchLower) ||
      guide.email?.toLowerCase().includes(searchLower) ||
      guide.country?.toLowerCase().includes(searchLower)
    );

    return { success: true, data: filtered };
  } catch (error) {
    console.error('검색 실패:', error);
    return { success: false, error: error.message, data: [] };
  }
}
