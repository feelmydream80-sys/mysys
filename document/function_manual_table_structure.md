# MSYS 기능 매뉴얼 - 표 형식 구조

## 🔄 모든 레벨 완전 분석 완료:

### 📋 최종 표 형식 구조:

| 레벨 | 실제 파일 | 주요 메소드 | 복잡도 | 설명 |
|------|-----------|-------------|--------|------|
| DB | DDL/*.sql<br>sql/dashboard/* | - | 고: 트리거<br>서브쿼리 포함 | 복합키, 타임존<br>자동 로그 |
| DAO<br>(Mapper) | **전체 DAO 파일들**:<br>mapper/dashboard_mapper.py,<br>dao/analytics_dao.py,<br>dao/user_dao.py,<br>dao/con_hist_dao.py,<br>dao/con_mst_dao.py,<br>dao/mngr_sett_dao.py,<br>dao/icon_dao.py,<br>dao/mapping_dao.py,<br>dao/data_spec_dao.py,<br>dao/schedule_settings_dao.py,<br>dao/trbl_hist_dao.py,<br>sql/dashboard/dashboard_sql.py | **데이터 조회 (50+개)**:<br>• Dashboard: get_summary, get_raw_data,<br>get_analytics_success_rate_trend,<br>get_trouble_by_code, get_event_log,<br>get_daily_job_counts<br>• Analytics: get_user_access_stats,<br>get_menu_access_stats,<br>get_menu_access_stats_weekly,<br>get_yearly_total_stats<br>• User: get_user_by_id, get_all_users,<br>update_user, delete_user<br>• 기타 DAO들: 각 도메인별 CRUD<br><br>**데이터 조작 (20+개)**:<br>• insert_*, update_*, delete_*<br>• save_event, insert_user_access_log<br>• 각 테이블별 CRUD 메소드들 | 중: SQL 생성<br>동적 쿼리<br>다중 집계<br>복합 조인 | 파라미터 바인딩<br>컬럼 변환<br>시간대 처리<br>트랜잭션 관리<br>**총 70+개 메소드**<br>(11개 DAO 파일) |
| SERVICE | **전체 SERVICE 파일들 (15개)**:<br>service/dashboard_service.py,<br>service/analysis_service.py,<br>service/auth_service.py,<br>service/user_service.py,<br>service/collection_schedule_service.py,<br>service/mngr_sett_service.py,<br>service/card_summary_service.py,<br>service/data_spec_service.py,<br>service/icon_service.py,<br>service/jandi_service.py,<br>service/mapping_service.py,<br>service/mst_service.py,<br>service/password_service.py,<br>service/spec_scraper_service.py,<br>service/trbl_service.py,<br>service/url_analyzer_service.py | **대시보드 비즈니스 (12개)**:<br>get_summary, get_raw_data,<br>get_analytics_success_rate_trend,<br>get_trouble_by_code, get_event_log,<br>get_daily_job_counts,<br>_calculate_fail_streak,<br>_get_allowed_job_ids 등<br><br>**인증/권한 (10+개)**:<br>login, logout, register,<br>change_password, validate_token,<br>get_user_permissions 등<br><br>**데이터 분석 (15+개)**:<br>get_analytics_data,<br>process_chart_data,<br>calculate_statistics,<br>generate_reports 등<br><br>**관리 기능 (20+개)**:<br>각 도메인별 CRUD,<br>설정 관리, 스케줄링,<br>데이터 검증 등 | 고: 복합 비즈니스<br>다중 검증<br>실시간 처리 | 권한+설정+데이터<br>상태 계산<br>통계 처리<br>예외 처리<br>**총 100+개 메소드**<br>(15개 SERVICE 파일) |
| JS | **전체 JS 모듈들 (10개)**:<br>static/js/modules/dashboard/*,<br>static/js/modules/data_analysis/*,<br>static/js/modules/chart_analysis/*,<br>static/js/modules/admin/*,<br>static/js/modules/common/*,<br>static/js/modules/data_spec/*,<br>static/js/modules/mngr_sett/*,<br>static/js/modules/rawData/*,<br>static/js/modules/ui_components/*,<br>static/js/modules/api.js | **데이터 관리 (20+개)**:<br>initialize*, load*, fetch*,<br>set*, get*, update*<br><br>**UI 렌더링 (30+개)**:<br>render*, display*, show*,<br>hide*, updateUI*, draw*<br><br>**이벤트 처리 (25+개)**:<br>handle*, on*, bind*,<br>addEventListener, click*,<br>change*, submit*<br><br>**API 통신 (15+개)**:<br>callAPI*, sendRequest*,<br>post*, get*, put*, delete* | 중: Promise/async<br>DOM 조작<br>이벤트 바인딩 | 병렬 로딩<br>상태 추적<br>에러 핸들링<br>캐싱 처리<br>**총 90+개 함수**<br>(10개 모듈) |
| HTML | **전체 템플릿들 (21개)**:<br>templates/dashboard.html,<br>templates/login.html,<br>templates/data_analysis.html,<br>templates/chart_analysis.html,<br>templates/mngr_sett.html,<br>templates/card_summary.html,<br>templates/collection_schedule.html,<br>templates/data_spec.html,<br>templates/jandi.html,<br>templates/mapping_management.html,<br>templates/change_password.html,<br>templates/base.html,<br>templates/navbar.html,<br>templates/raw_data.html,<br>templates/data_report.html,<br>templates/api_test.html,<br>templates/unauthorized.html,<br>templates/empty_base.html,<br>templates/test_css.html,<br>templates/collapsible_controls.html,<br>templates/analytics.html.bak | **메인 페이지 (5개)**:<br>dashboard.html, login.html,<br>data_analysis.html,<br>chart_analysis.html,<br>mngr_sett.html<br><br>**보조 페이지 (10개)**:<br>card_summary.html,<br>collection_schedule.html,<br>data_spec.html, jandi.html,<br>mapping_management.html,<br>change_password.html,<br>raw_data.html, data_report.html,<br>api_test.html, unauthorized.html<br><br>**공통 컴포넌트 (6개)**:<br>base.html, navbar.html,<br>empty_base.html, test_css.html,<br>collapsible_controls.html,<br>analytics.html.bak | 낮음: 템플릿<br>렌더링 | Jinja2 필터<br>조건문<br>반복문<br>변수 바인딩<br>**총 21개 템플릿** |

### 🎯 실제 코드 기반 데이터 예시:

- **DB**: `tb_con_hist` 테이블 - `job_id='CD101', con_id='CON001', status='CD901', start_dt='2025-12-18 14:30:15+09'`
- **DAO**: `DashboardMapper.get_summary()` - `params=('2025-12-01', '2025-12-31', False, ['CD101', 'CD102'])`
- **SERVICE**: `DashboardService.get_summary()` - `allowed_job_ids=['CD101'], fail_streak=2, final_count='Total=45, CD101=1, CD102=1'`
- **JS**: `dataFlowStatus` - `apiCallSuccess=true, apiResponseCount=45, dataProcessedCount=45`
- **HTML**: `templates/dashboard.html` - `{{ user.permissions }} = ['dashboard', 'data_analysis'], {{ current_date }} = '2025-12-18'`

## 📊 상세 레벨별 분석:

### DB 레벨 상세:
```sql
-- tb_con_hist: 메인 이력 테이블
CREATE TABLE tb_con_hist (
    job_id varchar(250) NOT NULL,      -- 작업 ID
    con_id varchar(250) NOT NULL,      -- 연결 ID
    rqs_info text,                     -- 요청 정보
    start_dt timestamptz,              -- 시작 시간 (타임존 포함)
    execution_dt timestamptz,          -- 실행 시간
    end_dt timestamptz,                -- 종료 시간
    status varchar(20),                -- 상태 코드
    trbl_hist_no integer,              -- 문제 이력 번호
    PRIMARY KEY (con_id, job_id)       -- 복합 프라이머리 키
);

-- 트리거: 변경 시 자동 로그 기록
CREATE TRIGGER trg_log_con_hist_changes
    AFTER INSERT OR UPDATE ON tb_con_hist
    FOR EACH ROW EXECUTE FUNCTION log_con_hist_changes();
```

### DAO(Mapper) 레벨 상세:
```python
class DashboardMapper:
    def get_summary(self, start_date, end_date, all_data, job_ids):
        query, params = DashboardSQL.get_dashboard_summary(start_date, end_date, all_data, job_ids)
        # 복합 SQL 쿼리 실행 및 결과 변환
        return convert_to_new_columns('TB_CON_HIST', results)
```

### SERVICE 레벨 상세:
```python
class DashboardService:
    def get_summary(self, start_date, end_date, user):
        # 1. 관리자 설정 + 아이콘 매핑
        settings_map = self._fetch_manager_settings_with_icons()

        # 2. 사용자 권한에 따른 데이터 필터링
        allowed_job_ids = self._get_allowed_job_ids(user)

        # 3. 과거 데이터 + 오늘 데이터 결합
        combined_data = self._combine_historical_and_today_data(start_date, end_date, allowed_job_ids, user)

        # 4. 설정 적용 및 필터링
        processed_data = self._apply_settings_and_filters(combined_data, settings_map)

        # 5. 연속 실패 계산
        self._add_fail_streaks(processed_data)

        # 6. 최종 데이터 로깅
        self._log_final_data_counts(processed_data)

        return processed_data
```

### JS 레벨 상세:
```javascript
// 데이터 흐름 추적 및 병렬 로딩
export async function initializeDashboardData() {
    // Promise.all로 MST/설정/아이콘 동시 로드
    await Promise.all([
        loadAllMstList()
    ]);
}

// 데이터 흐름 상태 추적
let dataFlowStatus = {
    dashboardSummaryFetch: { apiCallInitiated: false, apiCallSuccess: false },
    mstListFetch: { apiCallInitiated: false, apiCallSuccess: false },
    adminSettingsFetch: { apiCallInitiated: false, apiCallSuccess: false },
    iconsFetch: { apiCallInitiated: false, apiCallSuccess: false }
};
```

## 🔧 복잡한 로직 상세 설명:

### 연속 실패 계산 알고리즘:
```sql
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

### 권한 필터링 로직:
```python
def _get_allowed_job_ids(self, user, requested_job_ids=None):
    if not user:
        return None  # Allow all if no user context

    is_admin = 'mngr_sett' in user.get('permissions', [])
    if is_admin:
        return requested_job_ids

    user_permissions = set(user.get('data_permissions', []))
    if not user_permissions:
        return []

    if requested_job_ids:
        allowed = list(user_permissions.intersection(set(requested_job_ids)))
        return allowed

    return list(user_permissions)
```

### 6단계 SERVICE 처리 플로우:
1. **설정 로드**: 관리자 설정과 아이콘 매핑
2. **권한 검증**: 사용자별 데이터 접근 권한 확인
3. **데이터 결합**: 과거 통계 + 오늘 실시간 데이터
4. **설정 적용**: 대시보드 표시 여부 필터링
5. **상태 계산**: 연속 실패 및 임계값 기반 상태 결정
6. **결과 로깅**: 최종 데이터 카운트 로깅

---

*이 문서는 MSYS 시스템의 DB→DAO→SERVICE→JS→HTML 구조를 표 형식으로 정리한 참고 자료입니다.*
