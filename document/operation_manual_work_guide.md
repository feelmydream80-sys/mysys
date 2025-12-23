# MSYS 운영 매뉴얼 작업 가이드

## 1. 작업 개요

MSYS 시스템의 사용자 매뉴얼을 체계적으로 작성하기 위한 가이드 문서입니다. 각 메뉴의 실제 화면과 기능을 정확히 반영하여 전문적인 매뉴얼을 생성합니다.

## 2. 현재 작업 대상 메뉴들

### 2.1 인증 관련 화면
- [ ] 로그인 페이지 (`login_screenshot.png`)
- [ ] 회원가입 페이지 (`register_screenshot.png`)
- [ ] 비밀번호 변경 페이지 (`change_password_screenshot.png`)

### 2.2 메인 메뉴 화면
- [x] 대시보드 (기본 설명 완료, 세부 데이터 반영 완료)
- [ ] 데이터 분석 (`data_analysis_screenshot.png`)
- [ ] 차트 분석 (`chart_analysis_screenshot.png`)
- [ ] 잔디 (`jandi_screenshot.png`)
- [ ] 매핑 (`mapping_screenshot.png`)
- [ ] 상세 데이터 (`data_spec_screenshot.png`)
- [ ] 데이터 명세서 (`data_report_screenshot.png`)

### 2.3 관리자 설정 탭별 화면
- [x] 기본 설정 (스크린샷 및 설명 완료)
- [ ] 수집 스케줄 설정 (`admin_schedule_screenshot.png`)
- [ ] 아이콘 관리 (`admin_icon_screenshot.png`)
- [ ] 차트/시각화 설정 (`admin_chart_screenshot.png`)
- [ ] 사용자 관리 (`admin_user_screenshot.png`)
- [ ] 데이터 접근 권한 (`admin_permission_screenshot.png`)
- [ ] 통계 - 일별 현황 (`admin_stats_daily_screenshot.png`)
- [ ] 통계 - 주별/월별 현황 (`admin_stats_weekly_screenshot.png`)
- [ ] 통계 - 비교 현황 (`admin_stats_comparison_screenshot.png`)

### 2.4 데이터 수집 일정 화면
- [ ] 주간 일정 (`collection_schedule_weekly_screenshot.png`)
- [ ] 월간 일정 (`collection_schedule_monthly_screenshot.png`)

## 3. 작업 방법 및 절차

### 3.1 준비 단계
1. **시스템 실행**: `python msys_app.py`로 애플리케이션 실행
2. **스크린샷 촬영**: 각 메뉴 방문 후 화면 캡처
3. **실제 데이터 수집**: 화면에 표시되는 실제 데이터 확인

### 3.2 한 페이지씩 작업 진행
1. **메뉴 선택**: 작업할 메뉴 결정
2. **실제 데이터 제공**: 사용자가 해당 메뉴의 실제 화면 데이터 제공
3. **스크린샷 촬영**: 해당 메뉴의 스크린샷 촬영
4. **매뉴얼 작성**: 스크린샷 + 상세 설명으로 매뉴얼 생성
5. **품질 검토**: 생성된 매뉴얼 검토 및 수정

### 3.3 품질 관리 원칙

#### 3.3.1 정확성 확보
- **부정확한 정보 금지**: 추측이나 가상의 데이터 사용하지 않음
- **실제 데이터 사용**: 시스템에서 실제로 확인된 데이터만 사용
- **사용자 확인 의무**: 불확실한 정보는 반드시 사용자에게 확인

#### 3.3.2 완전성 기준
- **모든 UI 요소 설명**: 화면의 모든 버튼, 필드, 링크 설명
- **기능 설명**: 각 요소의 기능과 사용 방법 설명
- **데이터 의미**: 표시되는 데이터의 의미와 계산 방법 설명

#### 3.3.3 일관성 유지
- **용어 통일**: 동일한 용어는 일관되게 사용
- **형식 통일**: 모든 메뉴에 동일한 설명 형식 적용
- **참조 정확성**: 다른 메뉴 참조 시 정확한 링크와 설명

## 4. 매뉴얼 구조 표준

### 4.1 각 메뉴 매뉴얼 구성 요소

```
[메뉴 이름] 화면 설명
├── 1. 개요
├── 2. 화면 구성 요소 상세 설명
│   ├── 2.1 헤더/탭 영역
│   ├── 2.2 메인 컨텐츠 영역
│   ├── 2.3 사이드바/필터 영역
│   └── 2.4 푸터/액션 버튼 영역
├── 3. 데이터 구조 및 의미
│   ├── 3.1 표시되는 데이터 필드 설명
│   │   ├── 필드명: 데이터 유형, 단위, 의미
│   │   └── 계산 방식: (필요한 경우)
│   ├── 3.2 데이터 계산/집계 방식
│   │   ├── 기간별 계산: 일별/주별/월별 집계 방식
│   │   ├── 통계 계산: 평균, 합계, 백분율 등
│   │   └── 실시간 vs 배치: 데이터 업데이트 주기
│   ├── 3.3 상태 표시 기준 및 색상 코드
│   │   ├── 정상 상태: 조건식 + 색상/아이콘
│   │   ├── 경고 상태: 조건식 + 색상/아이콘
│   │   ├── 위험/오류 상태: 조건식 + 색상/아이콘
│   │   └── 상태 변경 조건 및 임계값
│   └── 3.4 실제 데이터 예시
│       ├── 정상 케이스: 구체적인 값과 상태
│       ├── 경고 케이스: 구체적인 값과 상태
│       └── 예외 케이스: 구체적인 값과 상태
├── 4. 사용자 인터랙션
│   ├── 4.1 기본 사용 방법 (단계별 절차)
│   ├── 4.2 고급 기능 사용법
│   ├── 4.3 필터 및 검색 기능
│   ├── 4.4 데이터 내보내기/가져오기
│   └── 4.5 단축키 및 특별 기능
├── 5. 문제 해결 및 참고사항
│   ├── 5.1 일반적인 오류 상황 및 해결 방법
│   ├── 5.2 데이터 이상 시 확인사항
│   ├── 5.3 성능 저하 시 조치 방법
│   └── 5.4 관련 메뉴 및 참고 자료
└── 6. 관리자 설정 연동 (해당 시)
    ├── 설정 가능 항목
    ├── 기본값 기준
    └── 변경 시 영향 범위
```

### 4.2 데이터 설명 가이드라인

#### 4.2.1 상태 표시 기준 작성 원칙
- **조건식 명시**: 상태를 결정하는 구체적인 조건을 수식으로 표현
  - 예: `(성공률 ≥ 임계값) AND (연속 실패 < 3)`
- **색상/아이콘 표준화**: 시스템 전체에 걸쳐 일관된 색상 사용
  - 녹색: 정상 상태
  - 노랑: 경고 상태
  - 빨강: 위험/오류 상태
- **임계값 출처 명시**: 해당 값들이 관리자 설정에 의해 변경 가능하며 현재 값들은 기본값을 기준으로 작성되었다고 반드시 명시

#### 4.2.2 계산 공식 표준화
- **성공률**: `(성공 건수 ÷ 총 시도 건수) × 100`
- **연속 실패**: `마지막 성공 이후 연속 실패 횟수`
- **평균 응답시간**: `총 처리시간 ÷ 총 요청 건수`
- **가용률**: `(정상 동작 시간 ÷ 전체 시간) × 100`

#### 4.2.3 예시 데이터 작성 원칙
- **실제 시스템 데이터 사용**: 가상의 데이터가 아닌 실제 확인된 값 사용
- **다양한 상태 커버**: 정상/경고/위험 상태 모두 예시 포함
- **시간 정보 포함**: 데이터 수집 시간 또는 기간 명시
- **문맥 설명**: 해당 상태가 왜 발생했는지 간단히 설명

### 4.3 사용자 인터랙션 설명 가이드라인

#### 4.3.1 단계별 절차 작성
1. **목표 명확화**: 각 단계의 목적을 먼저 설명
2. **입력값 명시**: 어떤 값을 입력/선택해야 하는지 구체적으로
3. **결과 확인**: 단계 완료 후 어떤 변화가 발생하는지 설명
4. **예외 처리**: 입력 오류 시 어떻게 처리되는지 포함

#### 4.3.2 필터/검색 기능 설명
- **필터 옵션**: 각 필터의 의미와 선택 기준
- **검색 방식**: 부분 일치/완전 일치 등 검색 로직
- **결과 정렬**: 기본 정렬 기준과 사용자 지정 정렬
- **페이지네이션**: 대량 데이터 처리 방식

### 4.4 문제 해결 가이드 작성 원칙

#### 4.4.1 오류 상황 분류
- **데이터 관련**: 값이 표시되지 않음, 이상값 표시
- **성능 관련**: 로딩 지연, 응답 없음
- **기능 관련**: 버튼 동작 안함, 필터 적용 안됨
- **권한 관련**: 접근 거부, 기능 제한

#### 4.4.2 해결 방법 구조화
1. **증상 확인**: 구체적인 오류 메시지 또는 이상 현상
2. **원인 분석**: 가능한 원인들 나열
3. **해결 절차**: 단계별 조치 방법
4. **예방 조치**: 재발 방지를 위한 권장사항

### 4.2 스크린샷 포함 기준
- **필수**: 메인 화면 전체 캡처
- **권장**: 특정 기능 강조를 위한 부분 캡처
- **파일명 규칙**: `{메뉴_영문명}_screenshot.png`
- **해상도**: 1920x1080 이상 권장

## 5. 작업 우선순위

### 5.1 Phase 1: 인증 및 기본 메뉴 (현재 진행 중)
1. 로그인/회원가입 화면
2. 대시보드 (완료)
3. 데이터 분석 화면

### 5.2 Phase 2: 고급 분석 메뉴
1. 차트 분석
2. 잔디 차트
3. 매핑 기능

### 5.3 Phase 3: 관리자 기능
1. 관리자 설정 각 탭
2. 데이터 수집 일정
3. 상세 데이터 조회

## 6. 품질 검증 체크리스트

### 6.1 내용 정확성
- [ ] 모든 설명이 실제 시스템과 일치하는가?
- [ ] 데이터 예시가 실제 데이터인가?
- [ ] 기능 설명이 실제 동작과 일치하는가?

### 6.2 완전성
- [ ] 화면의 모든 UI 요소가 설명되었는가?
- [ ] 모든 사용자 인터랙션이 커버되었는가?
- [ ] 예외 상황과 오류 처리 설명이 포함되었는가?

### 6.3 가독성
- [ ] 설명이 명확하고 이해하기 쉬운가?
- [ ] 전문 용어가 적절히 설명되었는가?
- [ ] 단계별 절차가 논리적인가?

### 6.4 일관성
- [ ] 다른 메뉴 매뉴얼과 용어/형식이 일치하는가?
- [ ] 참조 링크가 정확한가?
- [ ] 크로스 레퍼런스가 올바른가?

## 7. 작업 로그 및 진행 상황

### 7.1 완료된 작업
- [x] 대시보드 기본 설명 (운영 매뉴얼)
- [x] 관리자 설정 기본 탭 설명 (기능 매뉴얼)
- [x] 실제 대시보드 데이터 반영 (CD101-CD104, 실제 성공률 등)

### 7.2 현재 작업
- [ ] 로그인/회원가입 화면 매뉴얼 작성 준비 중

### 7.3 예정 작업
- [ ] 각 메뉴의 실제 데이터 수집 및 스크린샷 촬영
- [ ] 한 페이지씩 매뉴얼 생성 및 검토
- [ ] 전체 매뉴얼 통합 및 최종 검토

## 8. 참고 사항

### 8.1 작업 시 주의사항
- 실제 데이터를 최우선으로 사용
- 불확실한 정보는 즉시 사용자에게 확인
- 한 메뉴씩 완성도 높게 작업
- 지속적인 피드백 수용

### 8.2 파일 관리
- 스크린샷: `scrennshot/` 폴더에 저장
- 매뉴얼: `MSYS_Operation_Manual.docx`에 통합
- 백업: 중요한 변경사항은 Git 커밋

### 8.3 커뮤니케이션
- 작업 진행 상황을 명확히 공유
- 문제가 발생하면 즉시 보고
- 개선 제안은 적극 수용

## 9. 시스템 아키텍처 기반 문서 작성 가이드

### 9.1 DB→DAO→SERVICE→JS→HTML 구조 이해

MSYS 시스템은 5단계 계층 구조로 구성되어 있으며, 각 레벨의 모든 파일들을 분석하여 문서에 반영해야 합니다:

| 레벨 | 파일 수량 | 주요 역할 | 문서화 시 고려사항 |
|------|-----------|----------|-------------------|
| **DB** | DDL 스크립트 + SQL 쿼리 | 데이터 저장 및 검색 | 테이블 구조, 제약조건, 트리거 설명 |
| **DAO** | 11개 파일 (70+개 메소드) | 데이터 액세스 객체 | SQL 쿼리 생성, 파라미터 바인딩, 결과 변환 |
| **SERVICE** | 15개 파일 (100+개 메소드) | 비즈니스 로직 | 권한 검증, 데이터 가공, 상태 계산 |
| **JS** | 10개 모듈 (90+개 함수) | 프론트엔드 로직 | UI 렌더링, 이벤트 처리, API 호출 |
| **HTML** | 21개 템플릿 | 화면 템플릿 | Jinja2 변수, 조건문, 반복문 |

### 9.2 각 레벨별 문서 작성 가이드라인

#### 9.2.1 DB 레벨 문서화
```sql
-- 예시: tb_con_hist 테이블 설명
CREATE TABLE tb_con_hist (
    job_id varchar(250) NOT NULL,      -- 작업 ID
    con_id varchar(250) NOT NULL,      -- 연결 ID
    status varchar(20),                -- 상태 코드 (CD901: 성공, CD902: 실패)
    start_dt timestamptz,              -- 시작 시간 (Asia/Seoul 타임존)
    PRIMARY KEY (con_id, job_id)       -- 복합 프라이머리 키
);
```
**작성 시 포함사항:**
- 테이블 구조 및 컬럼 설명
- 제약조건 및 인덱스
- 트리거 및 자동화 로직
- 상태 코드 의미

#### 9.2.2 DAO 레벨 문서화
```python
# 예시: DashboardMapper.get_summary()
class DashboardMapper:
    def get_summary(self, start_date, end_date, all_data, job_ids):
        query, params = DashboardSQL.get_dashboard_summary(start_date, end_date, all_data, job_ids)
        # 복합 SQL 쿼리 실행 및 결과 변환
        return convert_to_new_columns('TB_CON_HIST', results)
```
**작성 시 포함사항:**
- 메소드별 SQL 쿼리 설명
- 파라미터 바인딩 방식
- 결과 변환 로직
- 에러 처리 방식

#### 9.2.3 SERVICE 레벨 문서화
```python
# 예시: DashboardService.get_summary() - 6단계 처리
def get_summary(self, start_date, end_date, user):
    # 1. 관리자 설정 + 아이콘 매핑
    settings_map = self._fetch_manager_settings_with_icons()

    # 2. 사용자 권한에 따른 데이터 필터링
    allowed_job_ids = self._get_allowed_job_ids(user)

    # 3. 과거 데이터 + 오늘 데이터 결합
    combined_data = self._combine_historical_and_today_data()

    # 4. 설정 적용 및 필터링
    processed_data = self._apply_settings_and_filters()

    # 5. 연속 실패 계산
    self._add_fail_streaks(processed_data)

    # 6. 최종 데이터 로깅
    self._log_final_data_counts(processed_data)
```
**작성 시 포함사항:**
- 비즈니스 로직 플로우
- 권한 검증 알고리즘
- 데이터 가공 방식
- 예외 처리 및 로깅

#### 9.2.4 JS 레벨 문서화
```javascript
// 예시: 데이터 관리 및 API 호출
export async function initializeDashboardData() {
    await Promise.all([
        loadAllMstList(),      // MST 데이터 로드
        loadAllAdminSettings(), // 관리자 설정 로드
        loadAllIcons()          // 아이콘 데이터 로드
    ]);
}

// 이벤트 처리
handleDateFilterChange(event) {
    const startDate = event.target.value;
    loadDashboardData(startDate, endDate);
}
```
**작성 시 포함사항:**
- 함수별 역할 분류 (데이터 관리, UI 렌더링, 이벤트 처리, API 통신)
- 비동기 처리 방식
- 상태 관리 로직
- 에러 핸들링

#### 9.2.5 HTML 레벨 문서화
```html
<!-- 예시: templates/dashboard.html -->
<div class="dashboard-container">
    <!-- 사용자 권한에 따른 조건부 렌더링 -->
    {% if user.permissions %}
        <div class="summary-cards">
            {{ user.permissions }} <!-- 권한 표시 -->
        </div>
    {% endif %}

    <!-- 데이터 반복 표시 -->
    {% for item in dashboard_data %}
        <div class="job-item" data-job-id="{{ item.job_id }}">
            {{ item.cd_nm }}: {{ item.success_rate }}%
        </div>
    {% endfor %}
</div>
```
**작성 시 포함사항:**
- 템플릿 변수 의미
- 조건문 및 반복문 로직
- CSS 클래스 구조
- JavaScript 연동 방식

### 9.3 실제 데이터 예시 작성 가이드

#### 9.3.1 DB→DAO→SERVICE→JS→HTML 데이터 흐름 실제 예시

**대시보드 데이터 조회 시나리오: 사용자가 대시보드에 접속하여 Job별 통계를 확인하는 과정**

##### **DB 레벨: 원본 데이터 저장**
```sql
-- tb_con_hist 테이블에 저장된 실제 데이터
-- 파일 위치: DDL/tb_con_hist.sql
CREATE TABLE tb_con_hist (
    job_id varchar(250) NOT NULL,      -- 작업 ID (CD101, CD102 등)
    con_id varchar(250) NOT NULL,      -- 연결 ID (CON001, CON002 등)
    start_dt timestamptz,              -- 시작 시간 (Asia/Seoul 타임존)
    end_dt timestamptz,                -- 종료 시간
    status varchar(20),                -- 상태 (CD901:성공, CD902:실패)
    rqs_info text,                     -- 요청 정보
    PRIMARY KEY (con_id, job_id)
);

-- 실제 저장된 데이터 예시
INSERT INTO tb_con_hist VALUES
    ('CD101', 'CON001', '2025-12-18 06:30:15+09', '2025-12-18 08:55:45+09', 'CD901', '데이터 수집 성공: 985건/1000건'),
    ('CD101', 'CON002', '2025-12-17 06:30:15+09', '2025-12-17 08:52:30+09', 'CD901', '데이터 수집 성공: 987건/1000건'),
    ('CD101', 'CON003', '2025-12-16 06:30:15+09', '2025-12-16 06:35:20+09', 'CD902', '데이터 수집 실패: 네트워크 오류'),
    ('CD102', 'CON004', '2025-12-18 07:15:30+09', '2025-12-18 09:45:15+09', 'CD901', '데이터 수집 성공: 1456건/1500건');
```

##### **DAO 레벨: 데이터 조회 및 변환**
```python
# 파일 위치: mapper/dashboard_mapper.py
class DashboardMapper:
    def get_summary(self, start_date, end_date, all_data, job_ids):
        """
        대시보드 요약 데이터 조회 메소드
        - 위치: mapper/dashboard_mapper.py
        - 기능: 지정된 기간과 Job에 대한 수집 통계 계산
        - 입력: start_date, end_date, all_data, job_ids
        - 출력: List[Dict] - 각 Job별 통계 데이터
        """
        query = """
            SELECT
                job_id,
                COUNT(*) as total_count,
                SUM(CASE WHEN status = 'CD901' THEN 1 ELSE 0 END) as success_count,
                ROUND(
                    (SUM(CASE WHEN status = 'CD901' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2
                ) as success_rate
            FROM tb_con_hist
            WHERE start_dt >= %s AND start_dt <= %s
            {job_filter}
            GROUP BY job_id
            ORDER BY job_id
        """

        params = [start_date, end_date]
        job_filter = ""
        if job_ids and len(job_ids) > 0:
            job_filter = "AND job_id IN ({})".format(','.join(['%s'] * len(job_ids)))
            params.extend(job_ids)

        query = query.format(job_filter=job_filter)

        # 쿼리 실행 및 결과 반환
        with self.connection.cursor() as cur:
            cur.execute(query, params)
            columns = [desc[0] for desc in cur.description]
            results = [dict(zip(columns, row)) for row in cur.fetchall()]

        return results

# 실제 호출 예시
mapper = DashboardMapper(db_connection)
raw_data = mapper.get_summary('2025-12-01', '2025-12-31', False, ['CD101', 'CD102'])
# 반환 데이터:
# [
#     {'job_id': 'CD101', 'total_count': 3, 'success_count': 2, 'success_rate': 66.67},
#     {'job_id': 'CD102', 'total_count': 1, 'success_count': 1, 'success_rate': 100.0}
# ]
```

##### **SERVICE 레벨: 비즈니스 로직 처리 및 데이터 정제**
```python
# 파일 위치: service/dashboard_service.py
class DashboardService:
    def get_summary(self, start_date, end_date, user):
        """
        대시보드 데이터 처리 메소드 (6단계 비즈니스 로직)
        - 위치: service/dashboard_service.py
        - 기능: DAO에서 조회한 원본 데이터를 비즈니스 규칙에 따라 정제
        - 입력: start_date, end_date, user(사용자 권한 정보)
        - 출력: List[Dict] - 대시보드 표시용 가공 데이터
        """
        # 1단계: 관리자 설정 로드
        settings_map = self._fetch_manager_settings_with_icons()

        # 2단계: 사용자 권한 검증 및 데이터 필터링
        allowed_job_ids = self._get_allowed_job_ids(user)
        if allowed_job_ids is not None and not allowed_job_ids:
            return []  # 권한 없는 경우 빈 배열 반환

        # 3단계: DAO를 통한 원본 데이터 조회
        raw_data = self.dashboard_mapper.get_summary(start_date, end_date, False, allowed_job_ids)

        # 4단계: 데이터 정제 및 계산
        processed_data = []
        for item in raw_data:
            job_id = item['job_id']

            # Job 이름 조회 (tb_con_mst에서)
            job_info = self._get_job_info(job_id)

            # 연속 실패 계산
            fail_streak = self._calculate_fail_streak(job_id)

            # 상태 결정 (설정 임계값 기반)
            job_settings = settings_map.get(job_id, DEFAULT_ADMIN_SETTINGS)
            threshold = job_settings.get('dly_sucs_rt_thrs_val', 80)

            if item['success_rate'] >= threshold:
                status = 'normal'
                color = job_settings.get('cnn_sucs_wrd_colr', '#008000')
            elif item['success_rate'] >= threshold * 0.8:  # 80% of threshold
                status = 'warning'
                color = job_settings.get('cnn_warn_wrd_colr', '#FFA500')
            else:
                status = 'danger'
                color = job_settings.get('cnn_failr_wrd_colr', '#FF0000')

            # 최종 데이터 구조화
            processed_item = {
                'job_id': job_id,
                'cd_nm': job_info.get('cd_nm', job_id),  # Job 한글명
                'success_rate': item['success_rate'],
                'total_count': item['total_count'],
                'success_count': item['success_count'],
                'fail_streak': fail_streak,
                'status': status,
                'color': color,
                'settings': job_settings
            }
            processed_data.append(processed_item)

        # 5단계: 최종 로깅
        self._log_final_data_counts(processed_data)

        return processed_data

# 실제 호출 및 결과 예시
service = DashboardService(db_connection)
result = service.get_summary(
    start_date='2025-12-01',
    end_date='2025-12-31',
    user={'user_id': 'admin', 'permissions': ['dashboard', 'mngr_sett'], 'data_permissions': ['CD101', 'CD102']}
)

# SERVICE에서 반환된 정제된 데이터:
# [
#     {
#         'job_id': 'CD101',
#         'cd_nm': '기상청 예보 데이터',
#         'success_rate': 66.67,
#         'total_count': 3,
#         'success_count': 2,
#         'fail_streak': 1,
#         'status': 'warning',
#         'color': '#FFA500',
#         'settings': {...}
#     },
#     {
#         'job_id': 'CD102',
#         'cd_nm': '실시간 기상 데이터',
#         'success_rate': 100.0,
#         'total_count': 1,
#         'success_count': 1,
#         'fail_streak': 0,
#         'status': 'normal',
#         'color': '#008000',
#         'settings': {...}
#     }
# ]
```

##### **JS 레벨: API 호출 및 UI 렌더링**
```javascript
// 파일 위치: static/js/modules/dashboard/dashboard.js
export async function loadDashboardData(startDate, endDate) {
    /**
     * 대시보드 데이터 로드 함수
     * - 위치: static/js/modules/dashboard/dashboard.js
     * - 기능: SERVICE에서 정제된 데이터를 API로 조회하여 UI에 표시
     * - 입력: startDate, endDate (문자열)
     * - 출력: Promise<void>
     */
    try {
        // API 호출 (SERVICE의 get_summary 메소드 호출)
        const response = await fetch(`/api/dashboard/summary?start_date=${startDate}&end_date=${endDate}`);
        if (!response.ok) throw new Error('API 호출 실패');

        // JSON 데이터 수신 (SERVICE에서 반환된 정제된 데이터)
        const data = await response.json();
        // data 구조:
        // [
        //     {
        //         job_id: 'CD101',
        //         cd_nm: '기상청 예보 데이터',
        //         success_rate: 66.67,
        //         status: 'warning',
        //         color: '#FFA500',
        //         ...
        //     }
        // ]

        // 데이터 상태 추적
        dataFlowStatus.dashboardSummaryFetch = {
            apiCallInitiated: true,
            apiCallSuccess: true,
            apiResponseCount: data.length,
            dataProcessedCount: data.length,
            error: null
        };

        // UI 렌더링 함수 호출
        renderSummaryCards(data);
        renderStatusTable(data);

    } catch (error) {
        console.error('대시보드 데이터 로드 실패:', error);
        dataFlowStatus.dashboardSummaryFetch.error = error.message;
    }
}

export function renderSummaryCards(data) {
    /**
     * 요약 카드 렌더링 함수
     * - 위치: static/js/modules/dashboard/dashboard.js
     * - 기능: SERVICE에서 정제된 데이터를 HTML로 변환하여 표시
     * - 입력: data (Array) - SERVICE에서 반환된 데이터 배열
     * - 출력: void
     */
    const container = document.getElementById('summary-cards');

    // 데이터별 카드 HTML 생성
    const cardsHtml = data.map(item => `
        <div class="card" style="border-left: 4px solid ${item.color}">
            <div class="card-header">
                <h3 class="card-title">${item.cd_nm}</h3>
                <span class="status-badge" style="background-color: ${item.color}">
                    ${item.status === 'normal' ? '정상' : item.status === 'warning' ? '경고' : '위험'}
                </span>
            </div>
            <div class="card-body">
                <div class="metric">
                    <span class="label">성공률:</span>
                    <span class="value">${item.success_rate}%</span>
                </div>
                <div class="metric">
                    <span class="label">총 실행:</span>
                    <span class="value">${item.total_count}회</span>
                </div>
                <div class="metric">
                    <span class="label">연속 실패:</span>
                    <span class="value">${item.fail_streak}회</span>
                </div>
            </div>
        </div>
    `).join('');

    container.innerHTML = cardsHtml;
}
```

##### **HTML 레벨: 최종 데이터 표시**
```html
<!-- 파일 위치: templates/dashboard.html -->
<div id="dashboard-container">
    <!-- 헤더 영역 -->
    <div class="dashboard-header">
        <h1>MSYS 대시보드</h1>
        <div class="date-filter">
            <label>기간:</label>
            <input type="date" id="startDate" value="2025-12-01">
            <input type="date" id="endDate" value="2025-12-31">
            <button id="refreshBtn" onclick="loadDashboardData()">조회</button>
        </div>
    </div>

    <!-- 요약 카드 영역 (JS에서 동적 생성) -->
    <div id="summary-cards" class="cards-grid">
        <!-- JS의 renderSummaryCards() 함수에 의해 동적 생성되는 영역 -->
        <!-- 실제 표시 예시:
        <div class="card" style="border-left: 4px solid #FFA500">
            <div class="card-header">
                <h3 class="card-title">기상청 예보 데이터</h3>
                <span class="status-badge" style="background-color: #FFA500">경고</span>
            </div>
            <div class="card-body">
                <div class="metric">
                    <span class="label">성공률:</span>
                    <span class="value">66.67%</span>
                </div>
                <div class="metric">
                    <span class="label">총 실행:</span>
                    <span class="value">3회</span>
                </div>
                <div class="metric">
                    <span class="label">연속 실패:</span>
                    <span class="value">1회</span>
                </div>
            </div>
        </div>
        -->
    </div>

    <!-- 상세 테이블 영역 -->
    <div class="table-container">
        <table id="status-table">
            <thead>
                <tr>
                    <th>Job ID</th>
                    <th>데이터명</th>
                    <th>성공률</th>
                    <th>총 실행</th>
                    <th>연속 실패</th>
                    <th>상태</th>
                </tr>
            </thead>
            <tbody>
                <!-- JS에서 동적 생성 -->
            </tbody>
        </table>
    </div>
</div>

<!-- JavaScript 로드 -->
<script type="module" src="{{ url_for('static', filename='js/modules/dashboard/dashboard.js') }}"></script>
```

#### **데이터 흐름 요약:**
1. **DB**: 원본 수집 이력 저장 (`tb_con_hist`)
2. **DAO**: SQL 쿼리로 데이터 조회 및 기본 집계 (`DashboardMapper.get_summary()`)
3. **SERVICE**: 비즈니스 로직 적용, 권한 필터링, 상태 계산 (`DashboardService.get_summary()`)
4. **JS**: API 호출로 데이터 수신, UI 렌더링 (`loadDashboardData()`, `renderSummaryCards()`)
5. **HTML**: 최종 사용자에게 데이터 표시 (`templates/dashboard.html`)

이렇게 각 레벨에서 데이터가 어떻게 변환되고 정제되는지를 보여주면, 개발자들이 시스템의 전체 데이터 흐름을 이해할 수 있습니다.

### 9.4 복잡한 로직 설명 가이드

#### 9.4.1 연속 실패 계산 알고리즘
```sql
-- 최근 10회 실행 중 실패 횟수 계산
SELECT COUNT(*) as fail_count
FROM (
    SELECT status
    FROM TB_CON_HIST h2
    WHERE h2.job_id = ?
    ORDER BY h2.start_dt DESC
    LIMIT 10
) recent_runs
WHERE recent_runs.status IN ('CD902', 'CD903')
```

#### 9.4.2 권한 필터링 로직
```python
def _get_allowed_job_ids(self, user, requested_job_ids=None):
    # 관리자 권한 확인
    is_admin = 'mngr_sett' in user.get('permissions', [])

    if is_admin:
        return requested_job_ids  # 모든 요청 허용

    # 일반 사용자 권한 필터링
    user_permissions = set(user.get('data_permissions', []))
    if requested_job_ids:
        # 교집합으로 허용된 Job ID만 반환
        allowed = list(user_permissions.intersection(set(requested_job_ids)))
        return allowed

    return list(user_permissions)
```

#### 9.4.3 6단계 SERVICE 처리 플로우
1. **설정 로드**: `_fetch_manager_settings_with_icons()`
   - 관리자 설정과 아이콘 매핑 데이터 조회

2. **권한 검증**: `_get_allowed_job_ids(user)`
   - 사용자 권한에 따른 데이터 접근 제어

3. **데이터 결합**: `_combine_historical_and_today_data()`
   - 과거 통계 + 오늘 실시간 데이터 병합

4. **설정 적용**: `_apply_settings_and_filters()`
   - 대시보드 표시 여부 및 필터링 적용

5. **상태 계산**: `_add_fail_streaks()`
   - 연속 실패 및 임계값 기반 상태 결정

6. **결과 로깅**: `_log_final_data_counts()`
   - 최종 데이터 카운트 및 모니터링 정보 기록

### 9.5 문서 작성 시 체크리스트

#### 9.5.1 각 메뉴 문서화 시 확인사항
- [ ] DB 테이블 구조 및 관계 설명 포함
- [ ] DAO 메소드별 SQL 쿼리 및 파라미터 설명
- [ ] SERVICE 비즈니스 로직 플로우 상세 설명
- [ ] JS 함수별 역할 및 이벤트 처리 설명
- [ ] HTML 템플릿 변수 및 조건문 설명
- [ ] 실제 데이터 예시 포함 (각 레벨별)
- [ ] 복잡한 알고리즘 코드 예시 포함
- [ ] 권한 및 보안 로직 설명 포함

#### 9.5.2 품질 검증 기준
- [ ] 모든 코드 예시는 실제 시스템에서 추출한 것
- [ ] 메소드/함수 수량이 실제 파일과 일치
- [ ] 데이터 흐름이 DB→DAO→SERVICE→JS→HTML 순서로 정확히 설명
- [ ] 예외 처리 및 에러 상황 설명 포함
- [ ] 성능 및 최적화 고려사항 포함

### 9.6 표 작성 주의사항

#### 9.6.1 공통 파일/클래스 정보 표시 방식
**문제점:** 같은 파일/클래스에 속하는 메소드들이 여러 행에 걸쳐 표시될 때 파일 정보가 반복되어 가독성이 떨어짐

**해결방법:** 공통 파일/클래스 정보는 첫 번째 행에만 표시하고, 나머지 행들은 빈 칸으로 두어 가독성을 높임

**적용 예시:**
```
레벨 | 파일/클래스 | 메소드/함수 | 복잡도 | 설명
DAO | mapper/dashboard_mapper.py sql/dashboard/* | get_summary(start_date, end_date, all_data, job_ids) | 중 | 지정된 기간과 Job에 대한 수집 통계 계산
DAO |                                    | get_raw_data(start_date, end_date, job_ids, all_data) | 중 | 원본 수집 데이터 조회
DAO |                                    | get_analytics_success_rate_trend(...) | 고 | 성공률 추이 데이터 조회
```

**적용 범위:** DB, DAO, SERVICE, JS, HTML 레벨의 모든 표에 적용

#### 9.6.2 메소드별 개별 행 생성 원칙
- 각 메소드/함수는 반드시 별도의 행으로 표시
- 메소드 시그니처는 완전하게 표시 (파라미터 포함)
- 복잡도는 낮음/중/고로 구분하여 표시
- 설명은 해당 메소드의 구체적인 기능을 명시

#### 9.6.3 표 구조 일관성 유지
- 모든 표는 동일한 컬럼 구조 유지 (레벨, 파일/클래스, 메소드/함수, 복잡도, 설명)
- 첫 번째 행을 제외한 나머지 행의 파일/클래스 컬럼은 빈 칸으로 유지
- 메소드/함수 컬럼에는 시그니처와 파라미터를 포함한 완전한 형태로 표시

이 가이드를 따라 각 메뉴의 문서를 작성하면, 개발자와 운영자가 시스템의 전체 구조를 정확히 이해하고 효과적으로 사용할 수 있는 완전한 매뉴얼이 됩니다.
