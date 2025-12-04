# Google Maps Local Guides Leaderboard 스펙 문서

> 출처: [Local Guides Connect - How to Read and Join the Leaderboards](https://www.localguidesconnect.com/t/how-to-read-and-join-the-leaderboards/367276)

---

## 1. 리더보드 개요

### 1.1 목적
- 모든 로컬 가이드에게 공평한 경쟁 환경(Level Playing Field) 제공
- 기여 시작 시점에 관계없이 누구나 Top 100에 진입할 수 있는 기회 부여
- 동일 레벨의 가이드끼리 비교할 수 있는 환경 제공

### 1.2 핵심 철학
> "레벨 1이든 레벨 10이든, 대도시든 시골 마을이든, 누구나 참여하고 Top 100에 오를 수 있다"

---

## 2. 리더보드 종류 (8가지)

| # | 리더보드 | 설명 |
|---|----------|------|
| 1 | **Points** | 총 포인트 기반 순위 |
| 2 | **Photo Views** | 사진 조회수 순위 |
| 3 | **Video Views** | 동영상 조회수 순위 |
| 4 | **Star Photos** | 개인 최고 조회수 사진 순위 |
| 5 | **Star Videos** | 개인 최고 조회수 동영상 순위 |
| 6 | **Star 360 Spheres** | 360도 사진 순위 |
| 7 | **Country Leaderboards** | 국가별 순위 |
| 8 | **Movers & Shakers** | 월간 포인트 변동 순위 |

---

## 3. 리더보드 구조

### 3.1 계층 구조
각 리더보드 유형은 다음으로 구성:

```
├── Overall Top 100 (전체 레벨 통합)
├── Level 10 Top 100
├── Level 9 Top 100
├── Level 8 Top 100
├── Level 7 Top 100
├── Level 6 Top 100
├── Level 5 Top 100
├── Level 4 Top 100
├── Level 3 Top 100
├── Level 2 Top 100
└── Level 1 Top 100
```

### 3.2 레벨별 분리 이유
- 높은 레벨 = 더 오래 활동 = 더 많은 기여/조회수
- 동일 레벨끼리 비교해야 공정한 경쟁 가능
- 예: Level 8은 다른 Level 8과 비교

---

## 4. 데이터 필드

### 4.1 사용자 기본 정보

| 필드 | 타입 | 설명 |
|------|------|------|
| `username` | string | Connect 사용자명 (필수) |
| `level` | number (1-10) | 로컬 가이드 레벨 |
| `country` | string | 국가 |
| `joinDate` | date | 참여 시작일 |

### 4.2 기여 지표

| 필드 | 타입 | 설명 |
|------|------|------|
| `points` | number | 총 포인트 |
| `photoCount` | number | 업로드한 사진 수 |
| `photoViews` | number | 총 사진 조회수 |
| `videoViews` | number | 총 동영상 조회수 |
| `reviews` | number | 리뷰 수 |
| `edits` | number | 수정 기여 수 |

### 4.3 Star Photo 관련

| 필드 | 타입 | 설명 |
|------|------|------|
| `starPhotoViews` | number | 최고 조회수 사진의 조회수 |
| `starPhotoDate` | date | Star Photo 업로드일 |
| `starPhotoCategory` | string | 장소 카테고리 |
| `starPhotoLocation` | string | 장소명 |
| `starPhotoScreenshotDate` | date | 스크린샷 촬영일 |

### 4.4 계산 지표

| 필드 | 산출 방식 | 설명 |
|------|-----------|------|
| `avgViewsPerPhoto` | photoViews / photoCount | 사진당 평균 조회수 (품질 지표) |
| `avgViewsPerDay` | starPhotoViews / daysSinceUpload | 일평균 조회수 |
| `monthlyPointChange` | currentPoints - lastMonthPoints | 월간 포인트 변동 |
| `percentChange` | (change / lastMonthPoints) × 100 | 변동률 (%) |
| `SPQ` | starPhotoViews / avgViewsPerPhoto | Star Photo Quotient (상대적 밝기) |

---

## 5. Star Photo Quotient (SPQ) 설명

### 5.1 개념
Star Photo가 전체 사진 평균 대비 얼마나 뛰어난지를 나타내는 지표

### 5.2 계산 예시

**Rod의 경우:**
| 사진 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10(Star) |
|------|---|---|---|---|---|---|---|---|---|----------|
| 조회수 | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 550 |

- 평균: 100
- SPQ = 550 / 100 = **5.5** (Star Photo가 평균의 5.5배)

**Stewart의 경우:**
| 사진 | 1 | 2 | 3 | 4(Star) |
|------|---|---|---|----------|
| 조회수 | 20 | 30 | 400 | 550 |

- 평균: 250
- SPQ = 550 / 250 = **2.2** (Star Photo가 평균의 2.2배)

→ Rod의 Star Photo가 상대적으로 더 "빛나는" 사진

---

## 6. 표기 규칙 (Conventions)

| 표기 | 의미 |
|------|------|
| `[Username]` | 이번 달 새로 참여한 가이드 |
| `(Username)` | 지난 달 레벨업한 가이드 |
| `Username**` | Google 직원 |
| `Username*` | Connect 모더레이터 |
| 청록색 배경 | 중앙값(Median) 해당 |

---

## 7. 순위 변동 규칙

### 7.1 진입 조건
- 해당 레벨의 Top 100 안에 들어야 리더보드에 표시
- Top 100 바로 아래 10명은 "Knocking on the Door" 그룹으로 추적

### 7.2 Movers & Shakers
- 신규 참여자: `?` 표시 (이전 데이터 없음)
- 미업데이트 참여자: `0` 표시

---

## 8. 업데이트 주기

- **월간 업데이트**: 매월 정기 업데이트
- **타임스탬프**: 각 리더보드에 업데이트 날짜 표시
- **자발적 데이터 제출**: 참여자가 직접 데이터 제공 (스크래핑 X)

---

## 9. 데이터 구조 예시 (JSON)

```json
{
  "guide": {
    "username": "AdamGT",
    "level": 10,
    "country": "Australia",
    "isGoogler": false,
    "isModerator": true,
    "joinedThisMonth": false,
    "leveledUpThisMonth": false
  },
  "stats": {
    "points": 125000,
    "photoCount": 2500,
    "photoViews": 15000000,
    "videoViews": 50000,
    "reviews": 350
  },
  "starPhoto": {
    "views": 2500000,
    "uploadDate": "2022-03-15",
    "screenshotDate": "2024-01-15",
    "category": "Restaurant",
    "location": "Sydney Opera House Cafe",
    "avgViewsPerDay": 3650,
    "spq": 166.67
  },
  "calculated": {
    "avgViewsPerPhoto": 6000,
    "monthlyPointChange": 1500,
    "percentChange": 1.2,
    "rank": {
      "overall": 15,
      "byLevel": 3
    }
  }
}
```

---

## 10. 구현 시 고려사항

### 10.1 필수 기능
- [ ] 전체 Top 100 리더보드
- [ ] 레벨별 Top 100 리더보드 (Level 1~10)
- [ ] 검색 및 필터링
- [ ] 정렬 옵션 (포인트, 조회수, 레벨 등)
- [ ] 다크 모드
- [ ] 반응형 디자인

### 10.2 선택 기능
- [ ] Movers & Shakers (월간 변동)
- [ ] 국가별 필터
- [ ] 사진당 평균 조회수 리더보드
- [ ] Star Photo 갤러리
- [ ] 통계 요약 (총 가이드 수, 총 포인트 등)
- [ ] 중앙값 하이라이트

### 10.3 데이터 소스 옵션
1. **수동 입력**: 참여자가 직접 데이터 제출
2. **JSON 파일**: 정적 JSON 파일로 관리
3. **Google Sheets API**: 스프레드시트 연동
4. **Firebase**: 실시간 데이터베이스

---

## 11. 참고 링크

- [Local Guides Connect](https://www.localguidesconnect.com/)
- [Top 100 Local Guides](https://top100localguides.com/) (원본 리더보드)
- [How to Join the Leaderboards](https://www.localguidesconnect.com/t/how-to-read-and-join-the-leaderboards/367276)
