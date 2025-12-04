/**
 * 통계 계산 유틸리티
 */

/**
 * 사진당 평균 조회수 계산
 */
export function calculateAvgViewsPerPhoto(photoViews, photoCount) {
  if (!photoCount || photoCount === 0) return 0;
  return Math.round(photoViews / photoCount);
}

/**
 * Star Photo 일평균 조회수 계산
 */
export function calculateAvgViewsPerDay(starViews, uploadDate) {
  if (!starViews || !uploadDate) return 0;

  const upload = uploadDate.toDate ? uploadDate.toDate() : new Date(uploadDate);
  const now = new Date();
  const daysDiff = Math.max(1, Math.floor((now - upload) / (1000 * 60 * 60 * 24)));

  return Math.round(starViews / daysDiff);
}

/**
 * Star Photo Quotient (SPQ) 계산
 * SPQ = Star Photo 조회수 / 전체 사진 평균 조회수
 */
export function calculateSPQ(starViews, avgViewsPerPhoto) {
  if (!avgViewsPerPhoto || avgViewsPerPhoto === 0) return 0;
  return Math.round((starViews / avgViewsPerPhoto) * 10) / 10; // 소수점 1자리
}

/**
 * 월간 변화량 계산
 */
export function calculateMonthlyChange(current, previous) {
  if (previous === null || previous === undefined) {
    return { change: null, percentChange: null };
  }

  const change = current - previous;
  const percentChange = previous > 0
    ? Math.round((change / previous) * 1000) / 10 // 소수점 1자리
    : 0;

  return { change, percentChange };
}

/**
 * 배열의 중앙값 계산
 */
export function calculateMedian(values) {
  if (!values || values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

/**
 * 순위 계산 (동점 처리 포함)
 * @param {Array} items - 정렬된 아이템 배열
 * @param {string} field - 비교할 필드명
 * @returns {Array} 순위가 추가된 배열
 */
export function assignRanks(items, field) {
  let currentRank = 1;
  let previousValue = null;
  let skipCount = 0;

  return items.map((item, index) => {
    const value = item[field];

    if (previousValue !== null && value === previousValue) {
      // 동점 - 같은 순위 유지
      skipCount++;
    } else {
      // 다른 값 - 새 순위 = 현재 위치 + 1
      currentRank = index + 1;
      skipCount = 0;
    }

    previousValue = value;

    return { ...item, rank: currentRank };
  });
}

/**
 * 레벨별 그룹핑
 */
export function groupByLevel(guides) {
  const groups = {};

  for (let level = 1; level <= 10; level++) {
    groups[level] = [];
  }

  guides.forEach(guide => {
    const level = guide.level || 1;
    if (groups[level]) {
      groups[level].push(guide);
    }
  });

  return groups;
}

/**
 * 국가별 그룹핑
 */
export function groupByCountry(guides) {
  const groups = {};

  guides.forEach(guide => {
    const country = guide.country || 'Unknown';
    if (!groups[country]) {
      groups[country] = [];
    }
    groups[country].push(guide);
  });

  return groups;
}
