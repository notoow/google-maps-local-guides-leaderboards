/**
 * Google Maps 로컬 가이드 프로필 파서
 *
 * 프로필 페이지에서 기여 데이터를 추출합니다.
 */

/**
 * 프로필 페이지에서 데이터 추출
 * @param {import('playwright').Page} page
 * @returns {Promise<Object|null>}
 */
export async function parseProfile(page) {
  try {
    // 프로필 데이터 추출
    const data = await page.evaluate(() => {
      const result = {
        level: 0,
        points: 0,
        reviewCount: 0,
        photoCount: 0,
        photoViews: 0,
        videoCount: 0,
        edits: 0,
        placesAdded: 0,
        roadsAdded: 0,
        factsAdded: 0,
        questionsAnswered: 0
      };

      // 숫자 파싱 헬퍼
      const parseNumber = (text) => {
        if (!text) return 0;
        // "1,234" -> 1234, "71,538" -> 71538, "230,686,853" -> 230686853
        text = text.trim().replace(/,/g, '').replace(/개$/, '');

        if (text.includes('K') || text.includes('천')) {
          return Math.round(parseFloat(text) * 1000);
        }
        if (text.includes('M') || text.includes('백만')) {
          return Math.round(parseFloat(text) * 1000000);
        }
        if (text.includes('B') || text.includes('십억')) {
          return Math.round(parseFloat(text) * 1000000000);
        }

        return parseInt(text) || 0;
      };

      const allText = document.body.innerText;

      // ===== 레벨 추출 =====
      // 방법 1: DOM 셀렉터 (div.PMkhac 영역)
      const levelContainer = document.querySelector('.PMkhac, .qLPauf');
      if (levelContainer) {
        const levelMatch = levelContainer.textContent.match(/Level\s*(\d+)|레벨\s*(\d+)/i);
        if (levelMatch) {
          result.level = parseInt(levelMatch[1] || levelMatch[2]);
        }
      }

      // 방법 2: 전체 텍스트에서 "Level X Local Guide" 패턴
      if (result.level === 0) {
        const levelPatterns = [
          /Level\s*(\d+)\s*Local Guide/i,
          /레벨\s*(\d+)/,
          /LV\.?\s*(\d+)/i
        ];
        for (const pattern of levelPatterns) {
          const match = allText.match(pattern);
          if (match) {
            result.level = parseInt(match[1]);
            break;
          }
        }
      }

      // ===== 포인트 추출 =====
      const pointsPatterns = [
        /(\d[\d,]*)\s*points?/i,
        /(\d[\d,]*)\s*포인트/,
        /points?\s*[:\s]*(\d[\d,]*)/i
      ];

      for (const pattern of pointsPatterns) {
        const match = allText.match(pattern);
        if (match) {
          result.points = parseNumber(match[1] || match[2]);
          break;
        }
      }

      // ===== 리뷰/평가 추출 =====
      // "리뷰 1,997개 평가 81개" 또는 "1,997 reviews 81 ratings"
      const reviewSection = document.querySelector('.TiFmlb, .iAEkYb');
      if (reviewSection) {
        const reviewText = reviewSection.textContent;
        // 한국어: "리뷰 1,997개"
        const korReviewMatch = reviewText.match(/리뷰\s*([\d,]+)/);
        if (korReviewMatch) {
          result.reviewCount = parseNumber(korReviewMatch[1]);
        }
        // 영어: "1,997 reviews"
        const engReviewMatch = reviewText.match(/([\d,]+)\s*reviews?/i);
        if (engReviewMatch && result.reviewCount === 0) {
          result.reviewCount = parseNumber(engReviewMatch[1]);
        }
      }

      // 전체 텍스트 fallback
      if (result.reviewCount === 0) {
        const reviewPatterns = [
          /리뷰\s*([\d,]+)/,
          /([\d,]+)\s*reviews?/i
        ];
        for (const pattern of reviewPatterns) {
          const match = allText.match(pattern);
          if (match) {
            result.reviewCount = parseNumber(match[1]);
            break;
          }
        }
      }

      // ===== 사진/조회수 추출 =====
      // "사진 71,538 조회수 230,686,853개"
      const photoSection = document.querySelector('.iAEkYb');
      if (photoSection) {
        const photoText = photoSection.textContent;
        // 한국어
        const korPhotoMatch = photoText.match(/사진\s*([\d,]+)/);
        if (korPhotoMatch) {
          result.photoCount = parseNumber(korPhotoMatch[1]);
        }
        const korViewsMatch = photoText.match(/조회수\s*([\d,]+)/);
        if (korViewsMatch) {
          result.photoViews = parseNumber(korViewsMatch[1]);
        }
        // 영어
        const engPhotoMatch = photoText.match(/([\d,]+)\s*photos?/i);
        if (engPhotoMatch && result.photoCount === 0) {
          result.photoCount = parseNumber(engPhotoMatch[1]);
        }
        const engViewsMatch = photoText.match(/([\d,]+)\s*views?/i);
        if (engViewsMatch && result.photoViews === 0) {
          result.photoViews = parseNumber(engViewsMatch[1]);
        }
      }

      // 전체 텍스트 fallback
      if (result.photoCount === 0) {
        const match = allText.match(/사진\s*([\d,]+)|([\d,]+)\s*photos?/i);
        if (match) {
          result.photoCount = parseNumber(match[1] || match[2]);
        }
      }
      if (result.photoViews === 0) {
        const match = allText.match(/조회수\s*([\d,]+)|([\d,]+)\s*views?/i);
        if (match) {
          result.photoViews = parseNumber(match[1] || match[2]);
        }
      }

      // ===== 기타 기여 통계 =====
      const contributionPatterns = {
        videoCount: [/([\d,]+)\s*videos?/i, /동영상\s*([\d,]+)/],
        edits: [/([\d,]+)\s*edits?/i, /수정\s*([\d,]+)/],
        placesAdded: [/([\d,]+)\s*places?\s*added/i, /추가된 장소\s*([\d,]+)/],
        roadsAdded: [/([\d,]+)\s*roads?\s*added/i, /추가된 도로\s*([\d,]+)/],
        factsAdded: [/([\d,]+)\s*facts?/i, /팩트\s*([\d,]+)/],
        questionsAnswered: [/([\d,]+)\s*answers?/i, /([\d,]+)\s*Q&A/i, /답변\s*([\d,]+)/]
      };

      for (const [key, patterns] of Object.entries(contributionPatterns)) {
        for (const pattern of patterns) {
          const match = allText.match(pattern);
          if (match) {
            result[key] = parseNumber(match[1]);
            break;
          }
        }
      }

      return result;
    });

    // 유효성 검사 - points만 있어도 성공
    if (data.points === 0) {
      console.warn('Could not extract profile data');
      return null;
    }

    return data;

  } catch (error) {
    console.error('Profile parsing error:', error.message);
    return null;
  }
}

/**
 * 프로필 URL에서 사용자 ID 추출
 * @param {string} url
 * @returns {string|null}
 */
export function extractUserId(url) {
  // https://www.google.com/maps/contrib/123456789012345678901/reviews
  const match = url.match(/\/contrib\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * 프로필 URL 유효성 검사
 * @param {string} url
 * @returns {boolean}
 */
export function isValidProfileUrl(url) {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.includes('google.com') &&
      parsed.pathname.includes('/maps/contrib/')
    );
  } catch {
    return false;
  }
}
