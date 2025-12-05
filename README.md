# Google Maps Local Guides Leaderboard

Google Maps 로컬 가이드들의 기여도를 추적하고 순위를 매기는 리더보드 웹사이트

## Features

- **리더보드**: 포인트, 리뷰, 사진, 조회수, V/P(사진당 평균 조회수) 기반 정렬
- **필터링**: 레벨별, 국가별 필터링
- **정렬**: 테이블 헤더 클릭으로 오름차순/내림차순 정렬 (기본: 포인트 내림차순)
- **다크 모드**: 시스템 설정 연동 + 수동 토글
- **반응형 디자인**: 데스크탑/태블릿/모바일 지원
- **자동 데이터 수집**: Playwright + GitHub Actions (매일 2회)
- **자동 승인**: 등록 즉시 활성화, 다음 스크래핑에서 데이터 수집 시작
- **프로필 링크**: 이름 클릭 시 Google Maps 프로필로 이동
- **국가 설정**: 리더보드에서 직접 국가 설정/변경 가능
- **Quick Add**: 관리자용 빠른 프로필 추가 기능

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (Vanilla, ES Modules)
- **Backend**: Firebase (Auth, Firestore)
- **Scraping**: Playwright (헤드리스 브라우저)
- **Hosting**: GitHub Pages
- **CI/CD**: GitHub Actions (매일 00:00, 12:00 KST 자동 실행)
- **Trigger**: Cloudflare Workers (외부 트리거용)

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
│   └── scrape.yml           # GitHub Actions 워크플로우 (Daily Scrape)
├── assets/
│   └── og-image.png         # Open Graph 이미지
├── docs/
│   └── LEADERBOARD_SPEC.md  # 리더보드 스펙 문서
├── scripts/scraper/
│   ├── index.js             # 스크래퍼 메인
│   ├── profile-parser.js    # 프로필 데이터 파서
│   └── package.json
├── src/
│   ├── css/
│   │   ├── variables.css    # CSS 변수 (색상, 간격 등)
│   │   ├── reset.css        # CSS 리셋
│   │   ├── components.css   # 버튼, 배지, 모달 등
│   │   ├── layout.css       # 헤더, 푸터, 히어로 등
│   │   ├── leaderboard.css  # 리더보드 테이블
│   │   └── responsive.css   # 반응형 스타일
│   └── js/
│       ├── app.js           # 메인 앱 (Firebase, 렌더링, 이벤트)
│       └── utils/
│           ├── format-number.js    # 숫자 포맷팅 유틸
│           └── inapp-redirect.js   # 인앱 브라우저 리다이렉트
├── index.html               # 메인 페이지 (리더보드)
├── register.html            # 등록 페이지
└── admin.html               # 관리자 페이지
```

## How It Works

### 리더보드 컬럼

| 컬럼 | 설명 |
|------|------|
| Rank | 현재 정렬 기준 순위 |
| Guide | 이름 (클릭 시 Google Maps 프로필), 국가 |
| Lv | 로컬 가이드 레벨 (1-10) |
| Points | 총 포인트 |
| Views | 사진 총 조회수 |
| Photos | 업로드한 사진 수 |
| V/P | 사진당 평균 조회수 (Views / Photos) |
| Reviews | 작성한 리뷰 수 |

### 사용자 등록 플로우

1. 사용자가 Google 로그인
2. Maps 프로필 URL 입력 (단축 URL 또는 정식 URL)
   - `https://maps.app.goo.gl/...`
   - `https://www.google.com/maps/contrib/...`
3. 국가 선택
4. 자동 승인 (status: approved)
5. 다음 스크래핑 시 데이터 수집 시작 (displayName, avatarUrl 자동 업데이트)

### 자동 스크래핑

- **스케줄**: 매일 00:00, 12:00 KST (GitHub Actions)
- **수동 실행**:
  - GitHub Actions 페이지에서 "Run workflow" 클릭
  - 특정 유저만 스크래핑 가능 (`user_id` 입력)
- **프로세스**:
  1. Firestore에서 pending/approved/active 상태 가이드 조회
  2. 각 프로필의 /photos, /reviews 페이지 스크래핑
  3. DOM에서 데이터 추출 (레벨, 포인트, 리뷰, 사진 등)
  4. Firestore 업데이트 + history 서브컬렉션에 이력 저장
  5. status를 'active'로 변경

### 수집 데이터

| 필드 | 설명 | 소스 페이지 |
|------|------|------------|
| displayName | 프로필 이름 | /photos |
| avatarUrl | 프로필 사진 URL | /photos |
| level | 로컬 가이드 레벨 | /photos |
| points | 총 포인트 | /photos |
| reviewCount | 리뷰 수 | /reviews |
| ratingCount | 평가 수 | /reviews |
| photoCount | 사진 수 | /photos |
| photoViews | 사진 조회수 | /photos |
| videoCount | 동영상 수 | /photos |
| edits | 수정 기여 수 | /photos |
| placesAdded | 추가한 장소 수 | /photos |
| roadsAdded | 추가한 도로 수 | /photos |
| factsAdded | 추가한 정보 수 | /photos |
| questionsAnswered | 답변한 Q&A 수 | /photos |

## URL 형식

등록 시 다음 형식의 URL을 사용할 수 있습니다:

```
# 단축 URL (권장)
https://maps.app.goo.gl/xxxxxx

# 정식 URL
https://www.google.com/maps/contrib/123456789012345678901
https://www.google.com/maps/contrib/123456789012345678901/photos
https://www.google.com/maps/contrib/123456789012345678901/reviews
```

스크래퍼는 자동으로 /photos와 /reviews 페이지를 모두 방문하여 데이터를 수집합니다.

## Development

### 로컬 테스트 (스크래퍼)

```bash
cd scripts/scraper

# service-account.json 파일 필요
node index.js

# 특정 유저만 스크래핑
TARGET_USER_ID=userId123 node index.js
```

### 워크플로우 수동 실행

GitHub Repository → Actions → Daily Scrape → Run workflow

## License

MIT

## Credits

- Inspired by [Top 100 Local Guides](https://top100localguides.com/)
- Built for the Local Guides community
