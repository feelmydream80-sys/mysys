# 01. Workflow Scenarios

작업 흐름 관련 시나리오 모음

---

## 시나리오 1: 수집 일정 메모장 기본 내용 질문

**상황**: 사용자가 "데이터 수집 일정에서 메모장 생성 버튼 누르면 기본적으로 적혀 있어야 하는게 뭐야?"

**진행 경로**:
1. 00-core.md 확인 → "데이터/JSON" 행 찾기
2. 03.workflow.md 이동
3. docs/msys/routes/collection-schedule-routes.md 참조
4. 그룹 메모 API 분석: `/api/group-memo` (GET/POST/PUT/DELETE)
5. TB_GRP_MEMO 테이블 구조 확인

**결과**: 기본 내용은 **없음 (빈 내용)**, 사용자가 직접 입력

**검토 결과**: ✅ 이 규칙대로 진행하면 정확한 답변 가능

---

## 시나리오 2: 대시보드 데이터 조회 문제

**상황**: 사용자가 "대시보드에서 카드 요약 데이터가 안 떠"

**진행 경로**:
1. 00-core.md 확인 → "기능 문제 분석/디버깅" 행 찾기
2. 03.workflow.md 이동
3. docs/verification/pipeline-analysis.md 참조
4. docs/msys/services/dashboard-service.md, docs/msys/routes/api-dashboard.md 참조
5. 파이프라인 분석: routes → service → dao → mapper → database
6. 카드 요약 데이터 흐름 확인

**검토 결과**: ✅ 파이프라인 추적으로 문제 원인 파악 가능

---

## 시나리오 3: 관리자 설정 페이지 UI 변경 요청

**상황**: 사용자가 "메뉴 설정 페이지 디자인 변경 요청"

**진행 경로**:
1. 00-core.md 확인 → "관리 페이지" 행 찾기
2. 04.design-change.md 이동
3. docs/core/admin-page-rules.md 참조
4. docs/msys/routes/mngr-sett-routes.md 참조
5. docs/msys/templates/screen-domain.md 참조
6. templates/mngr_sett.html 분석
7. 변경 파일 분석 후 계획 수립

**검토 결과**: ✅ 관리 페이지 규칙으로 정확한 안내 가능

---

## 시나리오 4: Git 커밋 요청 시 CR 보고서 생성

**상황**: 사용자가 "커밋해줘"라고 요청

**진행 경로**:
1. 00-core.md 확인 → "Git 작업" 행 찾기
2. 06.git-rules.md 이동
3. 커밋 전 필수 확인 (01.legacy-protection.md → 00-core.md)
4. 작업 유형 판별 (기능 작업 / 비기능 작업)
5. CR 보고서 생성:
   - CR ID: `REQ-yymm-nnn` 형식
   - 저장 위치: `docs/CR/REQ-yymm-nnn.md`
   - 커밋 메시지에 CR ID 포함

**검토 결과**: ✅ 지침 준수 시 CR 보고서 자동 생성 가능

---

## 시나리오 5: 지침 수정 요청

**상황**: 사용자가 "00-core.md에 새 규칙 추가해야 해"

**진행 경로**:
1. 00-core.md 확인
2. "핵심 규칙 문서 위치" 테이블 참조
3. 08.guideline-modification.md 이동
4. 80줄 초과 시:
   - 폴더 생성 (.clinerules/문서명/)
   - 기능별 문서로 분리
5. 기존 문서는 나침반 역할만 (제목 + 파일 위치 안내)

**검토 결과**: ✅ 지침 수정 규칙으로 정확한 안내 가능

---

## 관련 시나리오

- [02. 시간 처리 작업 시나리오](../../../.clinerules/docs/verification/scenarios/02-time-handling-workflow.md) - 시간/날짜 처리 워크플로우 검증
