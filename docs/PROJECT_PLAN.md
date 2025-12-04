# Google Maps Local Guides Leaderboard - 프로젝트 계획서

> 최종 업데이트: 2025-12

---

## 1. 프로젝트 개요

### 1.1 목표
Google Maps 로컬 가이드들의 기여도를 추적하고 순위를 매기는 리더보드 웹사이트 구축

### 1.2 핵심 특징
- **자동 데이터 수집**: Playwright로 매월 자동 스크래핑
- **무료 운영**: GitHub Actions + GitHub Pages + Firebase (무료 티어)
- **관리 최소화**: 등록 후 자동 승인, 자동 데이터 수집

---

## 2. 기술 스택

### 2.1 프론트엔드 (GitHub Pages)
| 기술 | 용도 |
|------|------|
| HTML/CSS/JS | 정적 웹사이트 |
| Firebase SDK (CDN) | 인증, 데이터베이스 |
| 반응형 디자인 | 모바일/PC 대응 |

### 2.2 백엔드 (서버리스)
| 기술 | 용도 |
|------|------|
| Firebase Auth | Google 로그인 |
| Firestore | 데이터베이스 |
| GitHub Actions | 자동 스크래핑 (매월 1일) |

### 2.3 스크래핑
| 기술 | 용도 |
|------|------|
| **Playwright** | 헤드리스 브라우저 |
| Node.js 20+ | 스크래핑 스크립트 |

---

## 3. 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                        사용자 플로우                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   사용자      │    │  GitHub      │    │  Firebase    │      │
│  │   브라우저    │◄──►│  Pages       │◄──►│  Firestore   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                                       ▲               │
│         │ Google 로그인                         │               │
│         ▼                                       │               │
│  ┌──────────────┐                              │               │
│  │  Firebase    │──────────────────────────────┘               │
│  │  Auth        │                                               │
│  └──────────────┘                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     자동 스크래핑 플로우                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  GitHub      │    │  Playwright  │    │  Google Maps │      │
│  │  Actions     │───►│  스크래퍼    │───►│  프로필 페이지│      │
│  │  (매월 1일)  │    │              │    │              │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                                   │
│         │                   │ 데이터 추출                       │
│         │                   ▼                                   │
│         │            ┌──────────────┐                          │
│         │            │  Firebase    │                          │
│         └───────────►│  Firestore   │                          │
│           저장       └──────────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. 데이터 수집 방식

### 4.1 참여자 등록 (최초 1회)
```
1. 사용자가 웹사이트 접속
2. Google 로그인
3. 폼 작성:
   - Google Maps 프로필 URL (필수)
     - 단축 URL: https://maps.app.goo.gl/...
     - 정식 URL: https://www.google.com/maps/contrib/...
   - 표시 이름
   - 국가
   - Local Guide 시작일
4. 자동 승인 (status: approved)
5. 다음 스크래핑 시 데이터 수집 시작
```

### 4.2 자동 데이터 수집 (매월)
```
GitHub Actions (매월 1일 00:00 UTC)
    │
    ▼
guides 컬렉션에서 approved/active 상태 가이드 목록 조회
    │
    ▼
각 사용자의 mapsProfileUrl을 정규화
(https://www.google.com/maps/contrib/{ID} 형태로 변환)
    │
    ▼
Playwright로 프로필 페이지 접속 (locale: en-US)
    │
    ▼
DOM에서 데이터 추출:
    - .FNyx3: 레벨 (Level X Local Guide)
    - .VEEl9c: 포인트 (XXX,XXX points)
    - .Qha3nb: 리뷰/평가 (X reviews · Y ratings)
    - .Qha3nb: 사진 수 (숫자만)
    - .Qha3nb: 사진 조회수 (숫자만)
    │
    ▼
Firebase에 업데이트 + history 서브컬렉션에 이력 저장
    │
    ▼
status: approved → active 변경
```

### 4.3 스크래핑 대상 데이터

| 필드 | DOM 셀렉터 | 패턴 (영어) | 패턴 (한국어) |
|------|-----------|-------------|--------------|
| level | `.FNyx3` | `Level X Local Guide` | `지역 가이드 레벨 X` |
| points | `.VEEl9c` | `XXX,XXX points` | `XXX,XXX점` |
| reviewCount | `.Qha3nb` | `X reviews` | `리뷰 X개` |
| ratingCount | `.Qha3nb` | `X ratings` | `평가 X개` |
| photoCount | `.Qha3nb` | 숫자만 | 숫자만 |
| photoViews | `.Qha3nb` | 숫자만 | 숫자만 |

---

## 5. 디렉토리 구조

```
google-maps-local-guides-leaderboards/
├── .github/
│   └── workflows/
│       └── scrape.yml           # GitHub Actions 스크래핑 워크플로우
│
├── docs/
│   ├── PROJECT_PLAN.md          # 이 문서
│   ├── LEADERBOARD_SPEC.md      # 리더보드 스펙
│   └── FIREBASE_SCHEMA.md       # Firebase 스키마
│
├── scripts/
│   └── scraper/
│       ├── index.js             # 스크래핑 메인 스크립트
│       ├── profile-parser.js    # 프로필 페이지 파서
│       └── package.json         # 스크래핑 의존성
│
├── src/
│   ├── css/
│   │   ├── variables.css        # CSS 변수 (색상, 폰트 등)
│   │   ├── reset.css            # CSS 리셋
│   │   ├── components.css       # 컴포넌트 스타일
│   │   ├── layout.css           # 레이아웃
│   │   ├── leaderboard.css      # 리더보드 테이블
│   │   └── responsive.css       # 반응형
│   │
│   └── js/
│       ├── app.js               # 메인 앱
│       └── utils/
│           └── format-number.js # 숫자 포맷팅
│
├── index.html                   # 메인 페이지 (리더보드)
├── register.html                # 참여 등록 페이지
├── admin.html                   # 관리자 페이지
└── README.md
```

---

## 6. 페이지 구성

### 6.1 메인 페이지 (index.html)
- 통계 요약 카드 (총 가이드 수, 총 포인트 등)
- 리더보드 테이블 (정렬 가능한 헤더)
- 검색 및 필터 (레벨별)
- 다크 모드 토글
- 로그인/로그아웃 버튼

### 6.2 등록 페이지 (register.html)
- Google 로그인 필수
- 폼 필드:
  - Google Maps 프로필 URL (단축 URL 또는 정식 URL)
  - 표시 이름
  - 국가
  - Local Guide 시작일
- 자동 승인 후 안내

### 6.3 관리자 페이지 (admin.html)
- 가이드 목록 관리
- 상태 변경 (active, banned 등)
- 수동 데이터 수정

---

## 7. GitHub Actions 워크플로우

### 7.1 스크래핑 워크플로우 (scrape.yml)

```yaml
name: Local Guides Scraper

on:
  schedule:
    - cron: '0 0 1 * *'  # 매월 1일 00:00 UTC
  workflow_dispatch:      # 수동 실행 가능

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        working-directory: scripts/scraper
        run: npm ci || npm install

      - name: Install Playwright browsers
        working-directory: scripts/scraper
        run: npx playwright install chromium --with-deps

      - name: Run scraper
        working-directory: scripts/scraper
        env:
          FIREBASE_SERVICE_ACCOUNT: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
        run: node index.js

      - name: Commit and push if changed
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add -A
          git diff --quiet && git diff --staged --quiet || git commit -m "Daily data update"
          git push
```

### 7.2 필요한 Secrets

| Secret | 설명 |
|--------|------|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Admin SDK 서비스 계정 JSON |

---

## 8. 구현 현황

### Phase 1: 기본 구조 ✅
- [x] 프로젝트 디렉토리 생성
- [x] Firebase 프로젝트 설정
- [x] Firestore 데이터베이스 생성
- [x] Security Rules 적용
- [x] 관리자 등록

### Phase 2: 프론트엔드 ✅
- [x] HTML 메인 페이지
- [x] CSS 스타일 시스템
- [x] 리더보드 UI (테이블 헤더 정렬)
- [x] 다크 모드
- [x] 반응형 디자인

### Phase 3: 인증 & 등록 ✅
- [x] Google 로그인 구현
- [x] 등록 폼 페이지
- [x] 자동 승인 플로우

### Phase 4: 관리자 기능 ✅
- [x] 관리자 페이지
- [x] 상태 변경 기능

### Phase 5: 자동 스크래핑 ✅
- [x] Playwright 스크래퍼 개발
- [x] 프로필 페이지 파서
- [x] GitHub Actions 워크플로우
- [x] Firebase 업데이트 로직
- [x] URL 정규화 (단축 URL 지원)
- [x] 영어/한국어 패턴 지원

### Phase 6: 배포 ✅
- [x] GitHub Pages 설정
- [x] README 작성

---

## 9. 비용

| 항목 | 비용 |
|------|------|
| GitHub Pages | 무료 |
| GitHub Actions | 무료 (월 2000분) |
| Firebase Auth | 무료 |
| Firestore | 무료 (일 50K 읽기/20K 쓰기) |
| **총합** | **무료** |

---

## 10. 리스크 및 대응

| 리스크 | 대응 |
|--------|------|
| Google이 스크래핑 차단 | 랜덤 딜레이, User-Agent 설정, 필요시 수동 전환 |
| 프로필 페이지 구조 변경 | DOM 셀렉터 업데이트 필요 (모니터링) |
| 참여자 수 급증 (100+) | GitHub Actions 시간 제한 주의, 배치 처리 |

---

## 11. 참고 자료

- [google-local-guides-api (GitHub)](https://github.com/jinwook-k/google-local-guides-api) - 참고용 비공식 API
- [Playwright 공식 문서](https://playwright.dev/)
- [Firebase 공식 문서](https://firebase.google.com/docs)
- [Top 100 Local Guides](https://top100localguides.com/) - 원본 리더보드
- [Local Guides Connect](https://www.localguidesconnect.com/)
