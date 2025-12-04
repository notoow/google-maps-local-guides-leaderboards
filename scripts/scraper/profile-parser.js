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
        ratingCount: 0,
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
        // "1,234" -> 1234, "71,538" -> 71538, "648,975점" -> 648975
        text = text.trim().replace(/,/g, '').replace(/[개점장]$/, '');

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

      // ===== 레벨 추출 =====
      // 방법 1: .FNyx3 셀렉터 (예: "지역 가이드 레벨 10")
      const levelEl = document.querySelector('.FNyx3');
      if (levelEl) {
        const levelMatch = levelEl.textContent.match(/레벨\s*(\d+)|Level\s*(\d+)/i);
        if (levelMatch) {
          result.level = parseInt(levelMatch[1] || levelMatch[2]);
        }
      }

      // 방법 2: 전체 텍스트 fallback
      if (result.level === 0) {
        const allText = document.body.innerText;
        const levelPatterns = [
          /레벨\s*(\d+)/,
          /Level\s*(\d+)\s*Local Guide/i,
          /Level\s*(\d+)/i
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
      // 방법 1: .VEEl9c 셀렉터 (예: "648,975점")
      const pointsEl = document.querySelector('.VEEl9c');
      if (pointsEl) {
        result.points = parseNumber(pointsEl.textContent);
      }

      // 방법 2: 전체 텍스트 fallback
      if (result.points === 0) {
        const allText = document.body.innerText;
        const pointsPatterns = [
          /([\d,]+)\s*점/,
          /([\d,]+)\s*points?/i
        ];
        for (const pattern of pointsPatterns) {
          const match = allText.match(pattern);
          if (match) {
            result.points = parseNumber(match[1]);
            break;
          }
        }
      }

      // ===== 리뷰/평가, 사진, 조회수 추출 =====
      // .Qha3nb 요소들에서 추출
      const qha3nbElements = document.querySelectorAll('.Qha3nb');
      for (const el of qha3nbElements) {
        const text = el.textContent.trim();

        // 리뷰/평가: "리뷰 1,997개 · 평가 81개" 또는 "1,997 reviews · 81 ratings"
        if (text.includes('리뷰') || text.includes('평가') || text.toLowerCase().includes('review') || text.toLowerCase().includes('rating')) {
          // 리뷰 수
          const korReviewMatch = text.match(/리뷰\s*([\d,]+)/);
          const engReviewMatch = text.match(/([\d,]+)\s*reviews?/i);
          if (korReviewMatch) {
            result.reviewCount = parseNumber(korReviewMatch[1]);
          } else if (engReviewMatch) {
            result.reviewCount = parseNumber(engReviewMatch[1]);
          }

          // 평가 수
          const korRatingMatch = text.match(/평가\s*([\d,]+)/);
          const engRatingMatch = text.match(/([\d,]+)\s*ratings?/i);
          if (korRatingMatch) {
            result.ratingCount = parseNumber(korRatingMatch[1]);
          } else if (engRatingMatch) {
            result.ratingCount = parseNumber(engRatingMatch[1]);
          }
          continue;
        }

        // 순수 숫자만 있는 경우 (사진 수 또는 조회수)
        // 사진 수와 조회수는 순서대로 나옴: 먼저 사진 수, 다음 조회수
        if (/^[\d,]+$/.test(text)) {
          const num = parseNumber(text);
          if (result.photoCount === 0) {
            result.photoCount = num;
          } else if (result.photoViews === 0) {
            result.photoViews = num;
          }
        }
      }

      // 전체 텍스트 fallback
      if (result.reviewCount === 0 || result.photoCount === 0) {
        const allText = document.body.innerText;

        if (result.reviewCount === 0) {
          const reviewMatch = allText.match(/리뷰\s*([\d,]+)|([\d,]+)\s*reviews?/i);
          if (reviewMatch) {
            result.reviewCount = parseNumber(reviewMatch[1] || reviewMatch[2]);
          }
        }

        if (result.photoCount === 0) {
          const photoMatch = allText.match(/사진\s*([\d,]+)|([\d,]+)\s*photos?/i);
          if (photoMatch) {
            result.photoCount = parseNumber(photoMatch[1] || photoMatch[2]);
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
