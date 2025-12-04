# Firebase/Firestore 스키마 및 네이밍 규칙

> 참고: 기존 프로젝트 CLAUDE.md 코딩 컨벤션 준수

---

## 1. 네이밍 규칙 (Naming Conventions)

### 1.1 Firestore 컬렉션/문서

| 구분 | 규칙 | 예시 |
|------|------|------|
| **컬렉션명** | snake_case, 복수형 | `guides`, `reports`, `submissions` |
| **문서 ID** | Firebase 자동생성 또는 의미있는 ID | `auto-id`, `user_{uid}` |
| **필드명** | camelCase | `photoViews`, `createdAt`, `userId` |

### 1.2 파일/코드

| 구분 | 규칙 | 예시 |
|------|------|------|
| **파일명** | kebab-case | `guide-service.js`, `use-auth.js` |
| **함수명** | camelCase, 동사+명사 | `fetchGuideData()`, `submitGuideForm()` |
| **상수** | UPPER_SNAKE_CASE | `MAX_PHOTO_COUNT`, `LEVEL_THRESHOLDS` |
| **컴포넌트** | PascalCase | `LeaderboardRow`, `GuideSubmitForm` |

---

## 2. Firestore 컬렉션 구조

### 2.1 guides (로컬 가이드 데이터)

```
컬렉션: guides
문서 ID: {odLxTydGbcKN2} (Firebase Auth UID)

guides/
├── {uid}/
│   ├── # 기본 정보
│   ├── odLxTydGbcKN2: string          # Firebase Auth UID
│   ├── odLxTydGbcKN2: string              # Google 이메일
│   ├── displayName: string         # 표시 이름
│   ├── mapsProfileUrl: string      # Google Maps 프로필 URL (검증용)
│   ├── country: string             # 국가 (ISO 3166-1 alpha-2)
│   ├── avatarUrl: string | null    # 프로필 이미지 URL
│   │
│   ├── # 로컬 가이드 지표
│   ├── level: number               # 로컬 가이드 레벨 (1-10)
│   ├── points: number              # 총 포인트
│   ├── photoCount: number          # 업로드한 사진 수
│   ├── photoViews: number          # 총 사진 조회수
│   ├── videoViews: number          # 총 동영상 조회수
│   ├── reviewCount: number         # 리뷰 수
│   │
│   ├── # Star Photo 정보
│   ├── starPhoto: {
│   │   ├── views: number           # Star Photo 조회수
│   │   ├── uploadDate: timestamp   # 업로드일
│   │   ├── screenshotDate: timestamp # 스크린샷 촬영일
│   │   ├── category: string        # 장소 카테고리
│   │   ├── location: string        # 장소명
│   │   └── screenshotUrl: string   # 스크린샷 이미지 URL (외부 링크)
│   │ }
│   │
│   ├── # 계산 지표 (서버에서 계산)
│   ├── avgViewsPerPhoto: number    # 사진당 평균 조회수
│   ├── avgViewsPerDay: number      # Star Photo 일평균 조회수
│   ├── spq: number                 # Star Photo Quotient
│   │
│   ├── # 메타데이터
│   ├── status: string              # 'pending' | 'approved' | 'rejected' | 'banned'
│   ├── isGoogler: boolean          # Google 직원 여부
│   ├── isModerator: boolean        # 모더레이터 여부
│   ├── joinedThisMonth: boolean    # 이번 달 신규 참여자
│   ├── leveledUpThisMonth: boolean # 이번 달 레벨업
│   │
│   ├── # 타임스탬프
│   ├── createdAt: timestamp        # 최초 등록일
│   ├── updatedAt: timestamp        # 마지막 수정일
│   └── approvedAt: timestamp | null # 승인일
```

### 2.2 submissions (데이터 제출 요청)

```
컬렉션: submissions
문서 ID: 자동생성

submissions/
├── {submissionId}/
│   ├── odLxTydGbcKN2: string              # 제출자 UID
│   ├── odLxTydGbcKN2: string              # 제출자 이메일
│   ├── type: string                # 'new' | 'update'
│   │
│   ├── # 제출 데이터 (guides 필드와 동일 구조)
│   ├── data: {
│   │   ├── level: number
│   │   ├── points: number
│   │   ├── photoViews: number
│   │   └── ... (guides 필드 참조)
│   │ }
│   │
│   ├── # 증빙 자료
│   ├── screenshotUrl: string       # 스크린샷 URL (imgur, Google Drive 등)
│   ├── mapsProfileUrl: string      # Google Maps 프로필 URL
│   │
│   ├── # 처리 상태
│   ├── status: string              # 'pending' | 'approved' | 'rejected'
│   ├── reviewedBy: string | null   # 처리한 관리자 UID
│   ├── reviewedAt: timestamp | null
│   ├── rejectReason: string | null # 거부 사유
│   │
│   ├── # 타임스탬프
│   ├── createdAt: timestamp
│   └── updatedAt: timestamp
```

### 2.3 reports (신고)

```
컬렉션: reports
문서 ID: 자동생성

reports/
├── {reportId}/
│   ├── reporterId: string          # 신고자 UID
│   ├── reporterEmail: string       # 신고자 이메일
│   ├── targetId: string            # 신고 대상 UID
│   ├── targetDisplayName: string   # 신고 대상 이름
│   │
│   ├── # 신고 내용
│   ├── reason: string              # 'data_manipulation' | 'fake_screenshot' |
│   │                               # 'duplicate_account' | 'other'
│   ├── detail: string              # 상세 설명
│   │
│   ├── # 처리 상태
│   ├── status: string              # 'pending' | 'reviewed' | 'resolved' | 'dismissed'
│   ├── action: string | null       # 'warning' | 'data_removed' | 'banned' | null
│   ├── reviewedBy: string | null   # 처리한 관리자 UID
│   ├── reviewNote: string | null   # 관리자 메모
│   │
│   ├── # 타임스탬프
│   ├── createdAt: timestamp
│   └── reviewedAt: timestamp | null
```

### 2.4 history (포인트/조회수 변동 이력)

```
컬렉션: guides/{odLxTydGbcKN2}/history (서브컬렉션)
문서 ID: {YYYY-MM} (년-월 형식)

guides/{uid}/history/
├── {2024-12}/
│   ├── points: number
│   ├── photoViews: number
│   ├── level: number
│   ├── recordedAt: timestamp
│   │
│   ├── # 변동량 (이전 달 대비)
│   ├── pointsChange: number
│   ├── photoViewsChange: number
│   └── percentChange: number
```

### 2.5 admins (관리자 목록)

```
컬렉션: admins
문서 ID: {uid}

admins/
├── {uid}/
│   ├── odLxTydGbcKN2: string
│   ├── odLxTydGbcKN2: string
│   ├── displayName: string
│   ├── role: string                # 'super_admin' | 'admin' | 'moderator'
│   ├── createdAt: timestamp
│   └── createdBy: string           # 추가한 관리자 UID
```

---

## 3. Firestore 인덱스 (복합 쿼리용)

```
# guides 컬렉션
- status ASC, points DESC          # 승인된 가이드 포인트순
- status ASC, level ASC, points DESC  # 레벨별 포인트순
- status ASC, photoViews DESC      # 사진 조회수순
- status ASC, avgViewsPerPhoto DESC # 사진당 평균 조회수순
- country ASC, points DESC         # 국가별 포인트순

# submissions 컬렉션
- status ASC, createdAt DESC       # 대기중 제출 최신순

# reports 컬렉션
- status ASC, createdAt DESC       # 대기중 신고 최신순
```

---

## 4. Security Rules (보안 규칙)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 관리자 확인 함수
    function isAdmin() {
      return exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    // guides: 누구나 읽기, 본인만 쓰기, 관리자만 승인
    match /guides/{odLxTydGbcKN2} {
      allow read: if true;
      allow create: if request.auth != null && request.auth.uid == odLxTydGbcKN2;
      allow update: if request.auth != null &&
        (request.auth.uid == odLxTydGbcKN2 || isAdmin());
      allow delete: if isAdmin();

      // history 서브컬렉션
      match /history/{month} {
        allow read: if true;
        allow write: if isAdmin();
      }
    }

    // submissions: 인증된 사용자만 생성, 본인만 읽기, 관리자만 처리
    match /submissions/{submissionId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null &&
        (request.auth.uid == resource.data.odLxTydGbcKN2 || isAdmin());
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }

    // reports: 인증된 사용자만 생성, 관리자만 읽기/처리
    match /reports/{reportId} {
      allow create: if request.auth != null;
      allow read, update, delete: if isAdmin();
    }

    // admins: 관리자만 읽기/쓰기
    match /admins/{odLxTydGbcKN2} {
      allow read, write: if isAdmin();
    }
  }
}
```

---

## 5. 상태값 ENUM 정의

### 5.1 Guide Status
```javascript
const GUIDE_STATUS = {
  PENDING: 'pending',       // 승인 대기
  APPROVED: 'approved',     // 승인됨
  REJECTED: 'rejected',     // 거부됨
  BANNED: 'banned'          // 영구 정지
};
```

### 5.2 Submission Status
```javascript
const SUBMISSION_STATUS = {
  PENDING: 'pending',       // 검토 대기
  APPROVED: 'approved',     // 승인됨
  REJECTED: 'rejected'      // 거부됨
};
```

### 5.3 Report Status
```javascript
const REPORT_STATUS = {
  PENDING: 'pending',       // 검토 대기
  REVIEWED: 'reviewed',     // 검토 중
  RESOLVED: 'resolved',     // 처리 완료
  DISMISSED: 'dismissed'    // 기각
};
```

### 5.4 Report Reason
```javascript
const REPORT_REASON = {
  DATA_MANIPULATION: 'data_manipulation',   // 데이터 조작 의심
  FAKE_SCREENSHOT: 'fake_screenshot',       // 스크린샷 위조
  DUPLICATE_ACCOUNT: 'duplicate_account',   // 중복 계정
  OTHER: 'other'                            // 기타
};
```

### 5.5 Admin Role
```javascript
const ADMIN_ROLE = {
  SUPER_ADMIN: 'super_admin',   // 최고 관리자
  ADMIN: 'admin',               // 관리자
  MODERATOR: 'moderator'        // 모더레이터
};
```

---

## 6. 데이터 흐름

```
┌─────────────────────────────────────────────────────────────┐
│                      사용자 플로우                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Google 로그인                                           │
│     └─► Firebase Auth (UID 생성)                            │
│                                                             │
│  2. 데이터 제출                                              │
│     └─► submissions 컬렉션에 저장 (status: 'pending')        │
│                                                             │
│  3. 관리자 승인                                              │
│     ├─► submissions.status = 'approved'                     │
│     └─► guides 컬렉션에 데이터 복사 (status: 'approved')     │
│                                                             │
│  4. 리더보드 표시                                            │
│     └─► guides 컬렉션에서 status='approved' 조회             │
│                                                             │
│  5. 신고 접수                                                │
│     └─► reports 컬렉션에 저장                                │
│                                                             │
│  6. 월간 업데이트                                            │
│     └─► guides/{uid}/history/{YYYY-MM} 서브컬렉션에 저장     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. 코드 구조 (예정)

```
src/
├── js/
│   ├── config/
│   │   └── firebase.js           # Firebase 초기화
│   │
│   ├── services/
│   │   ├── auth-service.js       # 인증 관련
│   │   ├── guide-service.js      # 가이드 데이터 CRUD
│   │   ├── submission-service.js # 제출 관리
│   │   ├── report-service.js     # 신고 관리
│   │   └── admin-service.js      # 관리자 기능
│   │
│   ├── utils/
│   │   ├── calculate-stats.js    # SPQ, 평균 계산
│   │   ├── format-number.js      # 숫자 포맷팅
│   │   └── validate-data.js      # 데이터 검증
│   │
│   └── app.js                    # 메인 앱
│
├── css/
│   └── ... (기존 구조)
│
└── index.html
```

---

## 8. 체크리스트

### Firebase 콘솔 설정
- [x] 프로젝트 생성
- [x] Authentication - Google 로그인 활성화
- [ ] Firestore Database 생성
- [ ] Security Rules 적용
- [ ] 복합 인덱스 생성

### 코드 구현
- [ ] Firebase 초기화
- [ ] Google 로그인 구현
- [ ] 리더보드 조회 기능
- [ ] 데이터 제출 폼
- [ ] 관리자 승인 페이지
- [ ] 신고 기능
