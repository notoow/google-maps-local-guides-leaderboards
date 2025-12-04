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
        // "1,234" -> 1234, "1.2K" -> 1200, "1.2M" -> 1200000
        text = text.trim().replace(/,/g, '');

        if (text.includes('K')) {
          return Math.round(parseFloat(text) * 1000);
        }
        if (text.includes('M')) {
          return Math.round(parseFloat(text) * 1000000);
        }
        if (text.includes('B')) {
          return Math.round(parseFloat(text) * 1000000000);
        }

        return parseInt(text) || 0;
      };

      // 레벨 추출 (여러 셀렉터 시도)
      const levelSelectors = [
        '[data-level]',
        '.level-badge',
        '[class*="level"]',
        'span:has-text("Level")'
      ];

      for (const selector of levelSelectors) {
        try {
          const el = document.querySelector(selector);
          if (el) {
            const match = el.textContent.match(/(\d+)/);
            if (match) {
              result.level = parseInt(match[1]);
              break;
            }
          }
        } catch (e) {}
      }

      // 포인트 추출
      const pointsPatterns = [
        /(\d[\d,]*)\s*points?/i,
        /points?\s*[:\s]*(\d[\d,]*)/i
      ];

      const allText = document.body.innerText;

      for (const pattern of pointsPatterns) {
        const match = allText.match(pattern);
        if (match) {
          result.points = parseNumber(match[1]);
          break;
        }
      }

      // 기여 통계 추출 (테이블이나 리스트에서)
      const contributionPatterns = {
        reviewCount: [/(\d[\d,KMB.]*)\s*reviews?/i, /reviews?\s*[:\s]*(\d[\d,KMB.]*)/i],
        photoCount: [/(\d[\d,KMB.]*)\s*photos?/i, /photos?\s*[:\s]*(\d[\d,KMB.]*)/i],
        photoViews: [/(\d[\d,KMB.]*)\s*photo\s*views?/i, /views?\s*[:\s]*(\d[\d,KMB.]*)/i],
        videoCount: [/(\d[\d,KMB.]*)\s*videos?/i],
        edits: [/(\d[\d,KMB.]*)\s*edits?/i],
        placesAdded: [/(\d[\d,KMB.]*)\s*places?\s*added/i],
        roadsAdded: [/(\d[\d,KMB.]*)\s*roads?\s*added/i],
        factsAdded: [/(\d[\d,KMB.]*)\s*facts?/i],
        questionsAnswered: [/(\d[\d,KMB.]*)\s*answers?/i, /(\d[\d,KMB.]*)\s*Q&A/i]
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

    // 유효성 검사
    if (data.level === 0 && data.points === 0) {
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
