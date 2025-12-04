# Google Maps Local Guides Leaderboard

Google Maps 로컬 가이드들의 기여도를 추적하고 순위를 매기는 리더보드 웹사이트

## Features

- 포인트, 리뷰, 사진 조회수 기반 리더보드
- 레벨별 필터링 및 정렬
- 다크 모드 지원
- 반응형 디자인
- 자동 월간 데이터 수집 (Playwright + GitHub Actions)

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Firebase (Auth, Firestore)
- **Scraping**: Playwright
- **Hosting**: GitHub Pages
- **CI/CD**: GitHub Actions

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase 프로젝트

### Installation

1. Clone the repository
```bash
git clone https://github.com/notoow/google-maps-local-guides-leaderboards.git
cd google-maps-local-guides-leaderboards
```

2. Install scraper dependencies
```bash
cd scripts
npm install
```

### Firebase Setup

1. Firebase Console에서 프로젝트 생성
2. Authentication에서 Google 로그인 활성화
3. Firestore Database 생성
4. 프로젝트 설정에서 웹 앱 추가 후 config 복사

### GitHub Actions Setup

1. Firebase Console → 프로젝트 설정 → 서비스 계정
2. "새 비공개 키 생성" 클릭
3. GitHub Repository → Settings → Secrets and variables → Actions
4. `FIREBASE_SERVICE_ACCOUNT` 시크릿에 JSON 내용 붙여넣기

## Project Structure

```
├── .github/workflows/    # GitHub Actions
├── docs/                 # 문서
├── scripts/              # 스크래퍼
│   └── scraper/
├── src/
│   ├── css/             # 스타일시트
│   └── js/              # JavaScript
├── index.html           # 메인 페이지
├── register.html        # 등록 페이지
└── admin.html           # 관리자 페이지
```

## How It Works

1. 사용자가 Google 로그인 후 Maps 프로필 URL 등록
2. 관리자가 승인
3. 매월 1일 GitHub Actions가 자동으로 Playwright 스크래퍼 실행
4. 각 사용자의 Maps 프로필에서 최신 데이터 수집
5. Firebase에 저장 → 리더보드 자동 업데이트

## License

MIT

## Credits

- Inspired by [Top 100 Local Guides](https://top100localguides.com/)
- Built for the Local Guides community
