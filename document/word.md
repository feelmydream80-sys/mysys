## API 키 관리 페이지 수정 계획서

### 📋 개요
- **작업 대상**: `templates/api_key_mngr.html`, `static/js/modules/api_key_mngr/ui.js`
- **작업 유형**: UI 수정 + 신규 기능 추가
- **규칙 준수**: 01-legacy-protection.md, 02-documentation.md, 04-design-change.md

---

### 🔧 수정 항목 상세

#### 1️⃣ 탭 내용 영역 백그라운드 색상 추가
- **파일**: `templates/api_key_mngr.html`
- **변경 내용**:
  - `#content0` → `class="tab-content p-8"` → `class="tab-content bg-gray-50 p-8"`
  - `#content1` → `class="tab-content hidden p-8"` → `class="tab-content hidden bg-gray-50 p-8"`
  - `#content2` → `class="tab-content hidden p-8"` → `class="tab-content hidden bg-gray-50 p-8"`
  - `#content3` (신규 설정 탭) → `class="tab-content hidden bg-gray-50 p-8"`

#### 2️⃣ 만료 임박(7일) 필터 버튼 주황색 배경 수정
- **파일**: `templates/api_key_mngr.html`
- **변경 내용**: `<style>` 태그에 명시적 CSS 추가
```css
/* 필터 버튼 색상 명시 */
.btn-filter-all { background-color: #f3f4f6; color: #374151; }
.btn-filter-all:hover { background-color: #e5e7eb; }
.btn-filter-ok { background-color: #d1fae5; color: #065f46; }
.btn-filter-ok:hover { background-color: #a7f3d0; }
.btn-filter-expiring-30 { background-color: #fef3c7; color: #92400e; }
.btn-filter-expiring-30:hover { background-color: #fde68a; }
.btn-filter-expiring-7 { background-color: #ffedd5; color: #c2410c; }
.btn-filter-expiring-7:hover { background-color: #fed7aa; }
.btn-filter-err { background-color: #fee2e2; color: #991b1b; }
.btn-filter-err:hover { background-color: #fecaca; }
```
- HTML 버튼 클래스도 함께 수정

#### 3️⃣ 설정 탭 추가 (content3)
- **파일**: `templates/api_key_mngr.html`
- **탭 네비게이션에 추가**:
```html
<a href="#" class="tab-btn text-gray-500 hover:text-gray-700 px-3 py-2 rounded-t-lg font-medium text-sm" data-tab="3">설정</a>
```
- **설정 폼 구성**:
  - 30일 전 메일 설정: 제목, 내용, 보내는 사람 Email
  - 7일 전 메일 설정: 제목, 내용, 보내는 사람 Email
  - 당일 메일 설정: 제목, 내용, 보내는 사람 Email
  - 저장 버튼

#### 4️⃣ 이벤트 리스트 섹션 추가
- **파일**: `templates/api_key_mngr.html` (설정 탭 하단 또는 별도 섹션)
- **테이블 구성**:
  - 전송 일시
  - 코드명 (CD)
  - 받는 사람 Email
  - 전송 성공/실패 여부
  - 오류 메시지 (실패 시)

#### 5️⃣ 백엔드 API 추가 (필요 시)
- **파일**: `routes/api/api_key_mngr_routes.py`, `service/api_key_mngr_service.py`
- 설정 저장/조회 API
- 이벤트 이력 조회 API

---

### 📝 진행 순서
1. 규칙 파일 읽기 (01-legacy-protection.md, 02-documentation.md, 04-design-change.md)
2. 탭 내용 영역 백그라운드 색상 추가
3. 필터 버튼 CSS 수정
4. 설정 탭 HTML 추가
5. 이벤트 리스트 테이블 추가
6. JavaScript 기능 추가 (ui.js)
7. 테스트 및 검증

---

**이 계획으로 진행하시겠습니까? 확인 후 Act Mode로 전환해주시면 규칙 파일을 먼저 읽은 후 단계별로 진행하겠습니다.**