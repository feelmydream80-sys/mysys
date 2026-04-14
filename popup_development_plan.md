# 📋 팝업(공지사항) 시스템 개발 계획서

**작성일**: 2026-04-14  
**버전**: 2.0  
**상태**: 개발 준비 완료

---

## 1. 개요

### 1.1 목적
본 문서는 MSYS 통합 관리 시스템의 팝업(공지사항) 기능 개발에 대한 전체 계획을 정의합니다.

### 1.2 배경
- 터미널 작업 중단으로 인해 팝업 관련 계획 문서가 유실됨
- 기존에 일부 구현된 DAO, Service, Routes 코드 존재
- `mngr_sett.html`에 팝업 관리 탭 UI가 이미 구현되어 있음
- 컬럼명 불일치 등 정리가 필요한 상태

### 1.3 요구사항 정의

| 기능 | 설명 | 우선순위 | 비고 |
|------|------|----------|------|
| **일정 기반 팝업** | 시작일/종료일 지정 후 자동 활성화 | 🔴 필수 | - |
| **다중 팝업 표시** | 최대 5개까지 동시 표시 | 🔴 필수 | z-index 겹침 방식 |
| **이미지 팝업** | 이미지 포함 팝업 등록 | 🔴 필수 | 전체 클릭 시 링크 |
| **클릭 영역 링크** | 팝업/이미지 클릭 시 링크 이동 | 🔴 필수 | 단일 링크 |
| **관리자 게시판** | 팝업 등록/수정/삭제 관리 | 🔴 필수 | mngr_sett.html 내 탭 |
| **1~7일 보지 않기** | 사용자가 1~7일 중 선택하여 숨김 | 🟡 중간 | 기본값 1일, 최대 7일 |
| **이미지 특정 영역 클릭** | 이미지의 특정 영역별 다른 링크 | 🟢 Phase 5 | 고급 기능, 추후 구현 |

---

## 2. 기존 구현 현황 분석

### 2.1 이미 구현된 부분

#### 백엔드
| 구성요소 | 파일 경로 | 상태 | 비고 |
|---------|-----------|------|------|
| **Database Schema** | `DDL/tb_popup_mst.sql` | ✅ 완료 | MySQL용 |
| **DAO Layer** | `dao/popup_dao.py` | ⚠️ 수정 필요 | PostgreSQL용, 컬럼명 불일치 |
| **Service Layer** | `service/popup_service.py` | ⚠️ 수정 필요 | 기본 CRUD만 구현 |
| **API Routes** | `routes/api/popup_routes.py` | ⚠️ 미등록 | 구현됐으나 앱 미연결 |

#### 프론트엔드 (mngr_sett.html)
| 기능 | 위치 | 상태 |
|------|------|------|
| **팝업 관리 탭** | Line 1055 | ✅ 완료 |
| **팝업 목록 테이블** | Line 1673-1708 | ✅ 완료 |
| **팝업 생성/수정 모달** | Line 1713-1822 | ✅ 완료 |
| **이미지 업로드** | Line 1736-1743 | ✅ 완료 (미리보기 포함) |
| **다시 보지 않음 기간** | Line 1787-1791 | ⚠️ 수정 필요 (1-7일로 변경) |
| **타겟 페이지 선택** | Line 1794-1814 | ✅ 완료 |

### 2.2 DDL 컬럼 구조 (TB_POPUP_MST)

```sql
CREATE TABLE TB_POPUP_MST (
    POPUP_ID        INT AUTO_INCREMENT PRIMARY KEY COMMENT '팝업 ID (PK)',
    TITL            VARCHAR(200) NOT NULL COMMENT '팝업 제목',
    CONT            TEXT COMMENT '팝업 내용 (HTML 가능)',
    IMG_PATH        VARCHAR(500) COMMENT '이미지 경로 (있을 경우)',
    LNK_URL         VARCHAR(500) COMMENT '링크 URL (클릭 시 이동)',
    
    -- 기간 설정
    START_DT        DATETIME NOT NULL COMMENT '팝업 시작일시',
    END_DT          DATETIME NOT NULL COMMENT '팝업 종료일시',
    
    -- 표시 설정
    USE_YN          CHAR(1) DEFAULT 'Y' COMMENT '사용 여부 (Y/N)',
    DISP_ORD        INT DEFAULT 999 COMMENT '표시 순서 (낮을수록 우선)',
    DISP_TYPE       VARCHAR(20) DEFAULT 'MODAL' COMMENT '표시 타입 (MODAL/SLIDE/BANNER)',
    
    -- 디자인 설정
    WIDTH           INT DEFAULT 500 COMMENT '팝업 너비 (px)',
    HEIGHT          INT COMMENT '팝업 높이 (px, NULL이면 auto)',
    BG_COLR         VARCHAR(7) DEFAULT '#FFFFFF' COMMENT '배경색',
    
    -- "보지 않기" 설정 (수정됨)
    HIDE_OPT_YN     CHAR(1) DEFAULT 'Y' COMMENT '숨김 옵션 표시 여부',
    HIDE_DAYS_MAX   INT DEFAULT 7 COMMENT '최대 숨김 일수 (1-7)',
    
    -- 타겟 설정
    TARGET_ROLE     VARCHAR(50) DEFAULT 'ALL' COMMENT '대상 역할 (ALL/ADMIN/USER)',
    TARGET_PAGES    VARCHAR(500) DEFAULT 'ALL' COMMENT '표시 페이지 (쉼표구분, ALL=전체)',
    
    -- 메타데이터
    REG_DT          DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '등록일시',
    REG_USER_ID     VARCHAR(50) COMMENT '등록자 ID',
    UPD_DT          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
    UPD_USER_ID     VARCHAR(50) COMMENT '수정자 ID',
    DEL_YN          CHAR(1) DEFAULT 'N' COMMENT '삭제 여부 (Y/N)',
    
    -- 인덱스
    INDEX IDX_TB_POPUP_MST_USE_YN (USE_YN),
    INDEX IDX_TB_POPUP_MST_DATE (START_DT, END_DT),
    INDEX IDX_TB_POPUP_MST_ORD (DISP_ORD)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='팝업 마스터 테이블';
```

### 2.3 컬럼명 불일치 문제

| DDL 컬럼명 | DAO 사용 컬럼명 | 조치 |
|-----------|----------------|------|
| TITL | title | DAO 수정 필요 |
| CONT | content | DAO 수정 필요 |
| START_DT | start_time | DAO 수정 필요 |
| END_DT | end_time | DAO 수정 필요 |
| USE_YN | use_yn | ✅ 동일 |
| REG_DT | reg_dtm | DAO 수정 필요 |
| UPD_DT | upd_dtm | DAO 수정 필요 |
| REG_USER_ID | regr_id | DAO 수정 필요 |
| UPD_USER_ID | updr_id | DAO 수정 필요 |
| HIDE_DAYS_MAX | hide_days_max | 새로 추가 필요 |

---

## 3. 시스템 아키텍처

### 3.1 전체 구조

```
┌─────────────────────────────────────────────────────────────┐
│                        사용자 화면                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   팝업 1     │  │   팝업 2     │  │   팝업 3     │       │
│  │  z:1050      │  │  z:1051      │  │  z:1052      │       │
│  │  offset:0    │  │  offset:20   │  │  offset:40   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                    (최대 5개까지)                             │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (JavaScript)                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  popup_display.js                                       ││
│  │  - 활성 팝업 API 조회 (/api/popups/active)              ││
│  │  - 최대 5개까지 다중 팝업 표시                          ││
│  │  - z-index 1050~1054, offset 20px씩 증가                ││
│  │  - 1~7일 보지 않기 localStorage 관리                    ││
│  │  - 이미지/팝업 클릭 시 링크 이동                        ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Backend (Flask)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ popup_routes │  │popup_service │  │  popup_dao   │       │
│  │   (API)      │  │ (Business)   │  │   (DB)       │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 다중 팝업 표시 전략

| 순서 | z-index | Offset X | Offset Y |
|------|---------|----------|----------|
| 1번째 | 1050 | 0px | 0px |
| 2번째 | 1051 | 20px | 20px |
| 3번째 | 1052 | 40px | 40px |
| 4번째 | 1053 | 60px | 60px |
| 5번째 | 1054 | 80px | 80px |

- **최대 5개**까지 동시 표시
- 초과 시 상위 5개만 표시 (DISP_ORD 기준 정렬)

### 3.3 1~7일 보지 않기 로직

```javascript
// 1. 팝업 표시 시 LocalStorage 체크
const hiddenPopups = JSON.parse(localStorage.getItem('hiddenPopups') || '{}');
const hideUntil = hiddenPopups[popupId];

if (hideUntil && new Date() < new Date(hideUntil)) {
    // 아직 숨김 기간임, 표시하지 않음
    return;
}

// 2. 사용자가 "N일 동안 보지 않기" 선택 시
function hidePopup(popupId, days) {
    const hiddenPopups = JSON.parse(localStorage.getItem('hiddenPopups') || '{}');
    const hideUntil = new Date();
    hideUntil.setDate(hideUntil.getDate() + days);
    
    hiddenPopups[popupId] = hideUntil.toISOString();
    localStorage.setItem('hiddenPopups', JSON.stringify(hiddenPopups));
}

// 3. 팝업 하단 UI
<select id="hideDaysSelect">
    <option value="1">1일 동안 보지 않기</option>
    <option value="2">2일 동안 보지 않기</option>
    <option value="3">3일 동안 보지 않기</option>
    <option value="4">4일 동안 보지 않기</option>
    <option value="5">5일 동안 보지 않기</option>
    <option value="6">6일 동안 보지 않기</option>
    <option value="7">7일 동안 보지 않기</option>
</select>
<button onclick="hidePopupAndClose()">닫기</button>
```

---

## 4. 개발 단계별 계획

### Phase 1: 백엔드 연결 (예상: 2시간)

**작업 목표:**
- 기존 코드 정리 및 애플리케이션 연결
- 컬럼명 통일
- Route 등록

**세부 작업:**

1. **컬럼명 통일** (DDL 기준으로 수정)
   - `dao/popup_dao.py`: 모든 SQL 쿼리의 컬럼명 수정
     - title → TITL
     - content → CONT
     - start_time → START_DT
     - end_time → END_DT
     - reg_dtm → REG_DT
     - upd_dtm → UPD_DT
     - regr_id → REG_USER_ID
     - updr_id → UPD_USER_ID
   - `service/popup_service.py`: 필드 참조 수정

2. **Route 등록**
   - `routes/__init__.py`: popup_api_bp blueprint 등록
   ```python
   from .api.popup_routes import popup_api_bp
   app.register_blueprint(popup_api_bp)
   ```

3. **이미지 업로드 기능 추가**
   - `routes/api/popup_routes.py`에 `/api/popups/upload` 엔드포인트 추가
   - `static/uploads/popups/` 디렉토리 생성
   - 파일 크기 제한: 5MB
   - 허용 확장자: jpg, jpeg, png, gif

**API 명세:**
```python
# 이미지 업로드 API
POST /api/popups/upload
Content-Type: multipart/form-data

Request:
- file: (binary image data)

Response:
{
    "success": true,
    "image_path": "/static/uploads/popups/20250414_abc123.jpg",
    "message": "이미지 업로드 성공"
}
```

---

### Phase 2: 관리자 화면 연결 (예상: 4시간)

**작업 목표:**
- `mngr_sett.html`의 팝업 탭을 백엔드와 연결
- JavaScript 로직 구현

**세부 작업:**

1. **새 파일 생성**: `static/js/pages/popup_management.js`
   - 팝업 목록 조회 (`GET /api/popups`)
   - 팝업 CRUD API 연동
   - 이미지 업로드 처리
   - 페이징 구현

2. **mngr_sett.html 수정**:
   - Line 1789-1791: "다시 보지 않음 기간"을 "최대 숨김 일수"로 변경
   - 드롭다운으로 1-7 선택 가능하도록 수정
   - `popupDontShowDays` → `popupHideDaysMax`로 변경

3. **필드 구조:**
   - 제목 (TITL)
   - 내용 (CONT)
   - 이미지 업로드 + 미리보기 (IMG_PATH)
   - 링크 URL (LNK_URL)
   - 게시 기간: 시작일(START_DT) ~ 종료일(END_DT)
   - 크기: 너비(WIDTH), 높이(HEIGHT)
   - 배경색 (BG_COLR)
   - 상태: 활성/비활성 (USE_YN)
   - **최대 숨김 일수**: 1-7일 중 선택 (HIDE_DAYS_MAX)
   - 타겟 페이지: 대시보드, 스케줄, 분석, 설정 (TARGET_PAGES)

---

### Phase 3: 사용자 팝업 표시 (예상: 4시간)

**작업 목표:**
- 모든 페이지에서 활성 팝업 표시
- 최대 5개까지 다중 팝업 동시 표시

**세부 작업:**

1. **새 파일 생성**: `static/js/modules/popup_display.js`

2. **동작 로직:**
```javascript
// 1. 페이지 로드 시 API 호출
const response = await fetch('/api/popups/active');
const activePopups = await response.json();

// 2. LocalStorage에서 숨김 정보 확인
const hiddenPopups = JSON.parse(localStorage.getItem('hiddenPopups') || '{}');

// 3. 표시할 팝업 필터링
const popupsToShow = activePopups
    .filter(popup => {
        const hideUntil = hiddenPopups[popup.POPUP_ID];
        return !hideUntil || new Date() > new Date(hideUntil);
    })
    .sort((a, b) => a.DISP_ORD - b.DISP_ORD)
    .slice(0, 5); // 최대 5개

// 4. 팝업 표시
popupsToShow.forEach((popup, index) => {
    createPopupElement(popup, index);
});

// 5. 팝업 생성 함수
function createPopupElement(popup, index) {
    const zIndex = 1050 + index;
    const offset = index * 20;
    
    const modal = document.createElement('div');
    modal.className = 'popup-modal';
    modal.style.cssText = `
        position: fixed;
        z-index: ${zIndex};
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%) translate(${offset}px, ${offset}px);
        width: ${popup.WIDTH || 500}px;
        height: ${popup.HEIGHT || 'auto'};
        background: ${popup.BG_COLR || '#FFFFFF'};
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    // 내용 구성
    let content = '';
    if (popup.IMG_PATH) {
        content += `<img src="${popup.IMG_PATH}" style="width:100%; cursor:pointer;" onclick="window.open('${popup.LNK_URL}', '_blank')">`;
    }
    if (popup.CONT) {
        content += `<div style="padding:15px;">${popup.CONT}</div>`;
    }
    
    // 1~7일 보지 않기 UI
    let hideOptions = '';
    if (popup.HIDE_OPT_YN === 'Y') {
        const maxDays = popup.HIDE_DAYS_MAX || 7;
        hideOptions = `
            <select id="hideDays-${popup.POPUP_ID}" style="margin-right:10px;">
                ${Array.from({length: maxDays}, (_, i) => 
                    `<option value="${i+1}">${i+1}일 동안 보지 않기</option>`
                ).join('')}
            </select>
            <button onclick="hidePopup(${popup.POPUP_ID})">닫기</button>
        `;
    }
    
    modal.innerHTML = `
        <div style="position:relative;">
            <button onclick="closePopup(${popup.POPUP_ID})" style="position:absolute;right:10px;top:10px;">×</button>
            <h3 style="padding:15px;margin:0;">${popup.TITL}</h3>
            ${content}
            <div style="padding:15px;border-top:1px solid #eee;">
                ${hideOptions}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}
```

3. **base.html 수정**:
   - 팝업 스타일시트 추가
   - `popup_display.js` 스크립트 로드

---

### Phase 4: 1~7일 보지 않기 기능 (예상: 2시간)

**작업 목표:**
- 사용자가 1~7일 중 선택하여 팝업 숨김
- LocalStorage 기반 관리

**세부 작업:**

1. **LocalStorage 구조:**
```javascript
{
    "hiddenPopups": {
        "1": "2025-04-21T10:00:00.000Z",  // popup_id: hide_until
        "3": "2025-04-25T10:00:00.000Z"
    }
}
```

2. **핵심 함수:**
```javascript
// 팝업 숨김 처리
function hidePopup(popupId) {
    const select = document.getElementById(`hideDays-${popupId}`);
    const days = parseInt(select.value);
    
    const hiddenPopups = JSON.parse(localStorage.getItem('hiddenPopups') || '{}');
    const hideUntil = new Date();
    hideUntil.setDate(hideUntil.getDate() + days);
    
    hiddenPopups[popupId] = hideUntil.toISOString();
    localStorage.setItem('hiddenPopups', JSON.stringify(hiddenPopups));
    
    // 팝업 닫기
    closePopup(popupId);
}

// 팝업 닫기 (숨김 없이)
function closePopup(popupId) {
    const popup = document.querySelector(`[data-popup-id="${popupId}"]`);
    if (popup) {
        popup.remove();
    }
}

// 만료된 숨김 정보 정리 (주기적)
function cleanupHiddenPopups() {
    const hiddenPopups = JSON.parse(localStorage.getItem('hiddenPopups') || '{}');
    const now = new Date();
    
    Object.keys(hiddenPopups).forEach(id => {
        if (new Date(hiddenPopups[id]) < now) {
            delete hiddenPopups[id];
        }
    });
    
    localStorage.setItem('hiddenPopups', JSON.stringify(hiddenPopups));
}
```

3. **정리 작업:**
   - 페이지 로드 시 `cleanupHiddenPopups()` 실행
   - 오래된 숨김 정보 자동 삭제

---

### Phase 5: 이미지 특정 영역 클릭 (고급 기능) - 추후 구현

**우선순위**: 낮음  
**예상 공수**: 8시간  
**조건**: Phase 1~4 완료 후 사용자 요청 시

**추가 필요사항:**

1. **새 테이블**: `TB_POPUP_IMG_AREA`
```sql
CREATE TABLE TB_POPUP_IMG_AREA (
    AREA_ID         INT AUTO_INCREMENT PRIMARY KEY,
    POPUP_ID        INT NOT NULL,
    AREA_NAME       VARCHAR(100) COMMENT '영역 이름',
    X_COORD         INT COMMENT 'X 좌표',
    Y_COORD         INT COMMENT 'Y 좌표',
    WIDTH           INT COMMENT '너비',
    HEIGHT          INT COMMENT '높이',
    LNK_URL         VARCHAR(500) COMMENT '링크 URL',
    REG_DT          DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (POPUP_ID) REFERENCES TB_POPUP_MST(POPUP_ID)
);
```

2. **관리자 화면 기능:**
   - 이미지 위에서 마우스로 영역 드래그
   - 각 영역에 이름, 링크 URL 입력
   - 좌표 자동 계산 및 저장

3. **사용자 화면:**
   - HTML `<map>`, `<area>` 태그 사용
   - 각 영역별 다른 링크 연결

---

## 5. API 명세

### 5.1 백엔드 API

| Method | Endpoint | 설명 | 권한 |
|--------|----------|------|------|
| GET | `/api/popups` | 전체 팝업 목록 | Admin |
| GET | `/api/popups/active` | 현재 활성 팝업 (사용자용) | 로그인 사용자 |
| GET | `/api/popups/<id>` | 특정 팝업 조회 | Admin |
| POST | `/api/popups` | 팝업 생성 | Admin |
| PUT | `/api/popups/<id>` | 팝업 수정 | Admin |
| DELETE | `/api/popups/<id>` | 팝업 삭제 (soft) | Admin |
| POST | `/api/popups/upload` | 이미지 업로드 | Admin |

### 5.2 UI 라우트

| Method | Endpoint | 설명 | 권한 |
|--------|----------|------|------|
| GET | `/admin/mngr_sett` | 관리자 설정 페이지 (팝업 탭 포함) | Admin |

### 5.3 API 상세

**GET /api/popups/active**
```json
// Request: (no params)

// Response
{
    "success": true,
    "popups": [
        {
            "POPUP_ID": 1,
            "TITL": "시스템 점검 안내",
            "CONT": "4월 15일 오전 2시부터 4시까지...",
            "IMG_PATH": "/static/uploads/popups/notice.jpg",
            "LNK_URL": "https://example.com/notice",
            "START_DT": "2025-04-14T00:00:00",
            "END_DT": "2025-04-16T23:59:59",
            "WIDTH": 600,
            "HEIGHT": 400,
            "BG_COLR": "#FFFFFF",
            "HIDE_OPT_YN": "Y",
            "HIDE_DAYS_MAX": 7,
            "TARGET_PAGES": "dashboard,schedule"
        }
    ]
}
```

**POST /api/popups**
```json
// Request
{
    "TITL": "신규 기능 안내",
    "CONT": "대시보드에 새로운 기능이 추가되었습니다...",
    "IMG_PATH": "/static/uploads/popups/feature.jpg",
    "LNK_URL": "https://example.com/feature",
    "START_DT": "2025-04-15T09:00:00",
    "END_DT": "2025-04-30T18:00:00",
    "USE_YN": "Y",
    "DISP_ORD": 1,
    "DISP_TYPE": "MODAL",
    "WIDTH": 500,
    "HEIGHT": 300,
    "BG_COLR": "#F0F8FF",
    "HIDE_OPT_YN": "Y",
    "HIDE_DAYS_MAX": 7,
    "TARGET_ROLE": "ALL",
    "TARGET_PAGES": "ALL"
}

// Response
{
    "success": true,
    "POPUP_ID": 2,
    "message": "팝업이 생성되었습니다."
}
```

---

## 6. 파일 생성/수정 목록

### 6.1 신규 생성 파일

```
static/js/pages/popup_management.js      # 관리자 화면 JS (mngr_sett.html 팝업 탭용)
static/js/modules/popup_display.js       # 사용자 팝업 표시 모듈
static/uploads/popups/                   # 이미지 업로드 디렉토리
```

### 6.2 수정 필요 파일

```
dao/popup_dao.py              # 컬럼명 통일 (DDL 기준)
service/popup_service.py      # 필드명 수정, HIDE_DAYS_MAX 추가
routes/api/popup_routes.py    # 이미지 업로드 엔드포인트 추가
routes/__init__.py            # blueprint 등록
templates/mngr_sett.html      # 팝업 탭 JS 연결, HIDE_DAYS_MAX 필드 수정
templates/base.html           # 팝업 스타일시트 및 JS 모듈 추가
DDL/tb_popup_mst.sql          # HIDE_HOURS → HIDE_DAYS_MAX 변경
```

---

## 7. 일정 및 공수

### 7.1 개발 일정

| Phase | 작업 내용 | 예상 공수 | 누적 공수 | 산출물 |
|-------|-----------|----------|----------|--------|
| Phase 1 | 백엔드 연결, 컬럼명 통일 | 2시간 | 2시간 | API 테스트 가능 |
| Phase 2 | 관리자 화면 연결 | 4시간 | 6시간 | CRUD 작업 가능 |
| Phase 3 | 사용자 팝업 표시 | 4시간 | 10시간 | 실제 팝업 표시 확인 |
| Phase 4 | 1~7일 보지 않기 | 2시간 | 12시간 | 숨김 기능 확인 |
| Phase 5 | 이미지 특정 영역 클릭 | 추후 | - | 고급 기능 |
| **총합** | **MVP 완성 (Phase 1~4)** | **12시간** | | |

### 7.2 단계별 완료 기준

- **Phase 1 완료**: Postman으로 모든 API 엔드포인트 정상 작동 확인
- **Phase 2 완료**: 관리자 화면에서 팝업 CRUD 작업 정상 수행
- **Phase 3 완료**: 사용자 화면에서 최대 5개까지 팝업 정상 표시
- **Phase 4 완료**: 1~7일 선택 후 팝업 재표시되지 않음 확인

---

## 8. 기술 스택 및 의존성

### 8.1 백엔드
- Flask (기존)
- PostgreSQL (기존)
- Flask-Login (기존 인증)

### 8.2 프론트엔드
- Vanilla JavaScript (ES6+)
- Tailwind CSS (기존 디자인 시스템)
- Axios (API 호출)

### 8.3 브라우저 저장소
- LocalStorage (1~7일 보지 않기 정보 저장)

---

## 9. 리스크 및 대응

| 리스크 | 가능성 | 영향도 | 대응 방안 |
|--------|--------|--------|----------|
| 컬럼명 통일 과정에서 오류 | 중 | 중 | 백업 생성, 단계별 테스트 |
| 이미지 업로드 보안 이슈 | 낮 | 높 | 확장자 체크, 파일 크기 제한, 저장 경로 검증 |
| 다중 팝업 z-index 충돌 | 낮 | 낮 | 1050 베이스, 20px씩 offset 적용 |
| LocalStorage 용량 초과 | 낮 | 낮 | 주기적 정리, 만료 데이터 자동 삭제 |
| Phase 5 복잡도 | 높 | 중 | Phase 1~4 완료 후 별도 검토 |

---

## 10. 참고 문서

- `.clinerules/00-core.md` - 핵심 규칙
- `.clinerules/03.workflow.md` - 워크플로우
- `.clinerules/04.design-change.md` - 디자인 변경 규칙
- `.clinerules/docs/core/admin-page-rules.md` - 관리 페이지 규칙
- `templates/mngr_sett.html` - 기준 UI 패턴 (Line 1673-1822 참조)

---

## 11. 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0 | 2026-04-14 | - | 초안 작성 |
| 2.0 | 2026-04-14 | - | 요구사항 확정 (1~7일 보지 않기, 최대 5개, Phase 5 분리) |

---

## 12. 다음 단계

### 바로 시작 가능한 작업

1. **Phase 1 시작**: `dao/popup_dao.py` 컬럼명 수정
2. **개발 순서**: Phase 1 → Phase 2 → Phase 3 → Phase 4 순차 진행
3. **테스트**: 각 Phase 완료 후 즉시 테스트

### 개발 시작 승인 대기 중

- [ ] DDL 수정 승인 (HIDE_HOURS → HIDE_DAYS_MAX)
- [ ] Phase 1 개발 시작 승인
- [ ] 전체 일정 승인 (총 12시간)

---

**계획서 작성 완료**
