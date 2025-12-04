/**
 * Local Guides Scraper
 *
 * Playwright를 사용하여 Google Maps 로컬 가이드 프로필 데이터를 수집합니다.
 * GitHub Actions에서 매월 자동 실행됩니다.
 */

import { chromium } from 'playwright';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { parseProfile } from './profile-parser.js';

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Firebase Admin 초기화
function initFirebase() {
  let serviceAccount;

  // 환경변수 우선, 없으면 로컬 파일 사용
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    try {
      const filePath = join(__dirname, 'service-account.json');
      serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      console.log('Using local service-account.json');
    } catch (error) {
      console.error('No service account found. Set FIREBASE_SERVICE_ACCOUNT env or provide service-account.json');
      process.exit(1);
    }
  }

  initializeApp({
    credential: cert(serviceAccount)
  });

  return getFirestore();
}

// 스크래핑 대상 가이드 목록 가져오기 (pending, approved, active)
async function getGuidesToScrape(db) {
  const snapshot = await db.collection('guides')
    .where('status', 'in', ['pending', 'approved', 'active'])
    .get();

  const guides = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.mapsProfileUrl) {
      guides.push({
        id: doc.id,
        ...data
      });
    }
  });

  console.log(`Found ${guides.length} guides to scrape`);
  return guides;
}

// URL 정규화 - 불필요한 파라미터 제거
function normalizeProfileUrl(url) {
  // maps.app.goo.gl 단축 URL은 그대로 사용 (Playwright가 리다이렉트 처리)
  if (url.includes('maps.app.goo.gl')) {
    return url;
  }

  // 정식 URL에서 contrib ID만 추출 (단축 URL 리다이렉트 대상과 동일한 형태)
  const match = url.match(/google\.com\/maps\/contrib\/(\d+)/);
  if (match) {
    return `https://www.google.com/maps/contrib/${match[1]}`;
  }

  return url;
}

// 가이드 프로필 스크래핑
async function scrapeGuideProfile(page, guide) {
  const originalUrl = guide.mapsProfileUrl;
  const url = normalizeProfileUrl(originalUrl);
  console.log(`Scraping: ${guide.displayName} - ${url}`);

  try {
    // 1차 시도: domcontentloaded (더 빠름)
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // 페이지 안정화 대기
    await page.waitForTimeout(3000);

    // 프로필 컨텐츠가 로드될 때까지 대기
    try {
      await page.waitForSelector('[data-section-id="contributions"]', { timeout: 10000 });
    } catch {
      // 셀렉터를 못 찾아도 진행 (다른 구조일 수 있음)
      console.log(`Waiting for content to stabilize...`);
      await page.waitForTimeout(2000);
    }

    // 프로필 데이터 추출
    const profileData = await parseProfile(page);

    if (!profileData) {
      console.warn(`Failed to parse profile for ${guide.displayName}`);
      return null;
    }

    console.log(`Scraped: Level ${profileData.level}, ${profileData.points} points, ${profileData.reviewCount} reviews, ${profileData.ratingCount} ratings, ${profileData.photoCount} photos, ${profileData.photoViews} views`);

    // 디버깅: .Qha3nb 요소들 출력
    if (profileData._debug_qha3nb) {
      console.log(`  .Qha3nb elements: ${JSON.stringify(profileData._debug_qha3nb)}`);
      delete profileData._debug_qha3nb; // Firebase에 저장하지 않음
    }

    return profileData;

  } catch (error) {
    console.error(`Error scraping ${guide.displayName}:`, error.message);
    return null;
  }
}

// Firebase에 데이터 업데이트
async function updateGuideData(db, guideId, oldData, newData) {
  const guideRef = db.collection('guides').doc(guideId);
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // 변동량 계산
  const pointsChange = newData.points - (oldData.points || 0);
  const photoViewsChange = newData.photoViews - (oldData.photoViews || 0);

  // 계산 지표
  const avgViewsPerPhoto = newData.photoCount > 0
    ? Math.round(newData.photoViews / newData.photoCount)
    : 0;

  // 레벨업 여부
  const leveledUp = newData.level > (oldData.level || 0);

  // 가이드 문서 업데이트 (status를 active로 변경)
  await guideRef.update({
    level: newData.level,
    points: newData.points,
    reviewCount: newData.reviewCount,
    ratingCount: newData.ratingCount || 0,
    photoCount: newData.photoCount,
    photoViews: newData.photoViews,
    videoCount: newData.videoCount || 0,
    edits: newData.edits || 0,
    placesAdded: newData.placesAdded || 0,
    roadsAdded: newData.roadsAdded || 0,
    factsAdded: newData.factsAdded || 0,
    questionsAnswered: newData.questionsAnswered || 0,
    avgViewsPerPhoto,
    leveledUpThisMonth: leveledUp,
    joinedThisMonth: false,
    status: 'active', // pending/approved → active after first scrape
    updatedAt: FieldValue.serverTimestamp()
  });

  // 이력 저장 (서브컬렉션)
  const historyRef = guideRef.collection('history').doc(monthKey);
  await historyRef.set({
    level: newData.level,
    points: newData.points,
    photoViews: newData.photoViews,
    reviewCount: newData.reviewCount,
    pointsChange,
    photoViewsChange,
    recordedAt: FieldValue.serverTimestamp()
  });

  console.log(`Updated: ${oldData.displayName} (+${pointsChange} points)`);
}

// 메인 실행
async function main() {
  console.log('=== Local Guides Scraper ===');
  console.log(`Started at: ${new Date().toISOString()}`);

  // Firebase 초기화
  const db = initFirebase();

  // 스크래핑 대상 가이드 목록
  const guides = await getGuidesToScrape(db);

  if (guides.length === 0) {
    console.log('No guides to scrape');
    return;
  }

  // 브라우저 시작
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
    locale: 'en-US'
  });

  const page = await context.newPage();

  let successCount = 0;
  let failCount = 0;

  // 각 가이드 스크래핑
  for (const guide of guides) {
    try {
      // 랜덤 딜레이 (1-3초)
      await page.waitForTimeout(1000 + Math.random() * 2000);

      const profileData = await scrapeGuideProfile(page, guide);

      if (profileData) {
        await updateGuideData(db, guide.id, guide, profileData);
        successCount++;
      } else {
        failCount++;
      }

    } catch (error) {
      console.error(`Error processing ${guide.displayName}:`, error.message);
      failCount++;
    }
  }

  await browser.close();

  console.log('=== Scraping Complete ===');
  console.log(`Success: ${successCount}, Failed: ${failCount}`);
  console.log(`Finished at: ${new Date().toISOString()}`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
