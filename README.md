# Google Maps Local Guides Leaderboard

Google Maps 로컬 가이드들의 기여도를 추적하고 순위를 매기는 리더보드 웹사이트

## Features

- 포인트, 리뷰, 사진, 조회수 기반 리더보드
- 레벨별 필터링 및 정렬 (테이블 헤더 클릭으로 정렬)
- 다크 모드 지원
- 반응형 디자인
- 자동 데이터 수집 (Playwright + GitHub Actions)
- 자동 승인 시스템 (등록 즉시 활성화)

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Firebase (Auth, Firestore)
- **Scraping**: Playwright (헤드리스 브라우저)
- **Hosting**: GitHub Pages
- **CI/CD**: GitHub Actions (매월 1일 자동 실행)

## Live Demo

https://notoow.github.io/google-maps-local-guides-leaderboards/

## Getting Started

### Prerequisites

- Node.js 20+
- Firebase 프로젝트

### Installation

1. Clone the repository
```bash
git clone https://github.com/notoow/google-maps-local-guides-leaderboards.git
cd google-maps-local-guides-leaderboards
```

2. Install scraper dependencies
```bash
cd scripts/scraper
npm install
npx playwright install chromium
```

### Firebase Setup

1. Firebase Console에서 프로젝트 생성
2. Authentication에서 Google 로그인 활성화
3. Firestore Database 생성
4. 프로젝트 설정에서 웹 앱 추가 후 config를 `src/js/app.js`에 적용

### GitHub Actions Setup

1. Firebase Console → 프로젝트 설정 → 서비스 계정
2. "새 비공개 키 생성" 클릭하여 JSON 다운로드
3. GitHub Repository → Settings → Secrets and variables → Actions
4. `FIREBASE_SERVICE_ACCOUNT` 시크릿에 JSON 내용 붙여넣기

## Project Structure

```
├── .github/workflows/
│   └── scrape.yml           # GitHub Actions 워크플로우
├── docs/
│   ├── PROJECT_PLAN.md      # 프로젝트 계획서
│   ├── FIREBASE_SCHEMA.md   # Firebase 스키마
│   └── LEADERBOARD_SPEC.md  # 리더보드 스펙
├── scripts/scraper/
│   ├── index.js             # 스크래퍼 메인
│   ├── profile-parser.js    # 프로필 데이터 파서
│   └── package.json
├── src/
│   ├── css/                 # 스타일시트
│   └── js/
│       ├── app.js           # 메인 앱
│       └── utils/           # 유틸리티
├── index.html               # 메인 페이지 (리더보드)
├── register.html            # 등록 페이지
└── admin.html               # 관리자 페이지
```

## How It Works

### 사용자 등록 플로우
1. 사용자가 Google 로그인
2. Maps 프로필 URL 입력 (단축 URL 또는 정식 URL)
   - `https://maps.app.goo.gl/...`
   - `https://www.google.com/maps/contrib/...`
3. 자동 승인 (status: approved)
4. 다음 스크래핑 시 데이터 수집 시작

### 자동 스크래핑
- **스케줄**: 매월 1일 00:00 UTC (GitHub Actions)
- **수동 실행**: GitHub Actions 페이지에서 "Run workflow" 클릭
- **프로세스**:
  1. Firestore에서 승인된 가이드 목록 조회
  2. 각 프로필 URL로 Playwright 접속
  3. DOM에서 데이터 추출 (레벨, 포인트, 리뷰, 사진 등)
  4. Firestore 업데이트 + history 서브컬렉션에 이력 저장

### 수집 데이터

| 필드 | 설명 | DOM 셀렉터 |
|------|------|-----------|
| level | 로컬 가이드 레벨 | `.FNyx3` |
| points | 총 포인트 | `.VEEl9c` |
| reviewCount | 리뷰 수 | `.Qha3nb` (텍스트 파싱) |
| ratingCount | 평가 수 | `.Qha3nb` (텍스트 파싱) |
| photoCount | 사진 수 | `.Qha3nb` |
| photoViews | 사진 조회수 | `.Qha3nb` |

## URL 형식

등록 시 다음 형식의 URL을 사용할 수 있습니다:

```
# 단축 URL (권장)
https://maps.app.goo.gl/xxxxxx

# 정식 URL
https://www.google.com/maps/contrib/123456789012345678901
```

스크래퍼는 자동으로 URL을 정규화하여 `https://www.google.com/maps/contrib/{ID}` 형태로 접속합니다.

## Development

### 로컬 테스트 (스크래퍼)

```bash
cd scripts/scraper

# service-account.json 파일 필요
node index.js
```

### 워크플로우 수동 실행

GitHub Repository → Actions → Local Guides Scraper → Run workflow

## License

MIT

## Credits

- Inspired by [Top 100 Local Guides](https://top100localguides.com/)
- Built for the Local Guides community
