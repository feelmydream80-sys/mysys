# service/dashboard_service.py
"""
Dashboard and Analytics Business Logic
Handles fetching and processing data for the dashboard and analytics pages.
"""
import logging
from typing import Optional, List, Dict
from mapper.dashboard_mapper import DashboardMapper
from mapper.user_mapper import UserMapper
from msys.database import get_db_connection
# Service Dependencies (Settings)
from mapper.mngr_sett_mapper import MngrSettMapper
from service.mngr_sett_service import DEFAULT_ADMIN_SETTINGS
from service.icon_service import IconService
from service.collection_schedule_service import CollectionScheduleService
from datetime import datetime
import pytz
from collections import defaultdict


class DashboardService:
    """
    Provides methods to retrieve data for the dashboard and analytics charts.
    """

    def __init__(self, db_connection):
        self.connection = db_connection
        self.dashboard_mapper = DashboardMapper(db_connection)
        self.user_mapper = UserMapper(db_connection)
        self.mngr_sett_mapper = MngrSettMapper(db_connection)

    def get_summary(self, start_date: Optional[str] = None, end_date: Optional[str] = None, all_data: bool = False, user: Optional[Dict] = None) -> List[Dict]:
        user_id_log = user.get('user_id') if user else 'None'
        logging.info(f"DashboardService.get_summary called for user: {user_id_log}")

        # 1. Fetch manager settings with icon codes
        settings_map = self._fetch_manager_settings_with_icons()

        # 2. Check data access permissions
        allowed_job_ids = self._get_allowed_job_ids(user)
        if allowed_job_ids is not None and not allowed_job_ids:
            return []

        # 3. Filter by use_yn = 'Y' from tb_con_mst
        from mapper.mst_mapper import MstMapper
        mst_mapper = MstMapper(self.connection)
        all_mst_data = mst_mapper.get_all_mst()
        active_mst_data = [mst for mst in all_mst_data if mst.get('use_yn') is None or mst.get('use_yn').upper().strip() == 'Y']
        active_job_ids = [mst['cd'] for mst in active_mst_data]

        # Apply use_yn filter to allowed job ids
        if allowed_job_ids is not None:
            filtered_job_ids = list(set(allowed_job_ids) & set(active_job_ids))
        else:
            filtered_job_ids = active_job_ids

        if not filtered_job_ids:
            return []

        # 4. Combine historical data with today's schedule
        combined_summary_data = self._combine_historical_and_today_data(
            start_date, end_date, all_data, filtered_job_ids, user
        )

        # 4. Combine summary data with settings and apply filters
        processed_summary_data = self._apply_settings_and_filters(combined_summary_data, settings_map)

        # 5. Add fail streak calculations
        self._add_fail_streaks(processed_summary_data)

        # 6. Log final data counts
        self._log_final_data_counts(processed_summary_data)

        return processed_summary_data

    def _fetch_manager_settings_with_icons(self) -> Dict[str, Dict]:
        """Fetch all manager settings and create a lookup map with icon codes."""
        try:
            # Fetch raw settings and icon data
            all_settings_raw = self.mngr_sett_mapper.get_all_settings()

            icon_service = IconService(self.connection)
            all_icons = icon_service.get_all_icons_data()
            icon_code_map = {icon['icon_id']: icon['icon_cd'] for icon in all_icons}

            # Add icon codes to each setting object
            all_settings_with_codes = []
            for setting_raw in all_settings_raw:
                combined_setting = setting_raw.copy()
                icon_fields = [
                    'cnn_failr_icon_id', 'cnn_warn_icon_id', 'cnn_sucs_icon_id',
                    'sucs_rt_sucs_icon_id', 'sucs_rt_warn_icon_id'
                ]
                for field in icon_fields:
                    icon_id = combined_setting.get(field)
                    combined_setting[f'{field}_code'] = icon_code_map.get(icon_id)
                all_settings_with_codes.append(combined_setting)

            # Create the final settings map
            settings_map = {setting['cd']: setting for setting in all_settings_with_codes}
            logging.info(f"Successfully fetched and mapped {len(settings_map)} manager settings with icon codes.")
            return settings_map
        except Exception as e:
            logging.error(f"Failed to fetch manager settings in DashboardService: {e}", exc_info=True)
            return {}

    def _combine_historical_and_today_data(self, start_date: Optional[str], end_date: Optional[str],
                                         all_data: bool, allowed_job_ids: Optional[List[str]],
                                         user: Optional[Dict]) -> List[Dict]:
        """Combine historical summary data with today's schedule data."""
        # Fetch historical summary data
        historical_summary_list = self.dashboard_mapper.get_summary(start_date, end_date, all_data, allowed_job_ids)
        logging.info(f"[PIPELINE-1] Historical data count from DB: {len(historical_summary_list)}")
        historical_summary_map = {item['job_id']: item for item in historical_summary_list}
        logging.info(f"[PIPELINE-2] Historical summary map keys: {list(historical_summary_map.keys())}")

        # Fetch today's schedule and status
        kst = pytz.timezone('Asia/Seoul')
        today = datetime.now(kst).date()
        collection_schedule_service = CollectionScheduleService(self.connection)
        job_statuses_today = collection_schedule_service.get_schedule_only(today, today, user)
        logging.info(f"[PIPELINE-3] Today's schedule count from CollectionScheduleService: {len(job_statuses_today)}")
        logging.info(f"[PIPELINE-3.1] Today's schedule job_ids: {[j.get('job_id') for j in job_statuses_today]}")

        # Process today's data to get counts
        today_counts = self._process_today_schedule_data(job_statuses_today)
        logging.info(f"[PIPELINE-4] Today counts keys: {list(today_counts.keys())}")
        logging.info(f"[PIPELINE-4.1] Today counts data: {dict(today_counts)}")

        # Only use job IDs that exist in historical data
        all_known_job_ids = sorted(list(set(historical_summary_map.keys())))
        logging.info(f"[PIPELINE-5] all_known_job_ids (historical only): {all_known_job_ids}")
        logging.info(f"[PIPELINE-5.1] Missing from today_counts: {[jid for jid in today_counts.keys() if jid not in all_known_job_ids]}")

        # Build the final combined summary data
        combined_summary_data = []
        for job_id in all_known_job_ids:
            hist_data = historical_summary_map.get(job_id, {})
            today_data = today_counts[job_id]

            item = self._create_combined_item(job_id, hist_data, today_data)
            combined_summary_data.append(item)
        
        logging.info(f"[PIPELINE-6] Final combined summary data count: {len(combined_summary_data)}")
        logging.info(f"[PIPELINE-6.1] Final job_ids: {[item.get('job_id') for item in combined_summary_data]}")

        return combined_summary_data

    def _process_today_schedule_data(self, job_statuses_today: List[Dict]) -> Dict[str, Dict]:
        """Process today's schedule data to get status counts per job."""
        today_counts = defaultdict(lambda: {"success": 0, "fail": 0, "progress": 0, "uncollected": 0, "total_scheduled": 0})

        # StatusCodeService를 사용하여 코드 기반으로 분류
        from service.status_code_service import status_code_service
        
        # Service가 초기화되지 않았거나 빈 리스트 반환 시 기본값 사용
        success_codes = status_code_service.get_success_codes() if status_code_service else []
        fail_codes = status_code_service.get_fail_codes() if status_code_service else []
        in_progress_codes = status_code_service.get_in_progress_codes() if status_code_service else []
        
        # 빈 리스트 체크 및 기본값 적용
        if not success_codes:
            success_codes = ['CD901']
            print(f"[DEBUG-CODES] Using default success_codes: {success_codes}")
        if not fail_codes:
            fail_codes = ['CD902', 'CD903']
            print(f"[DEBUG-CODES] Using default fail_codes: {fail_codes}")
        if not in_progress_codes:
            in_progress_codes = ['CD904']
            print(f"[DEBUG-CODES] Using default in_progress_codes: {in_progress_codes}")

        for job in job_statuses_today:
            job_id = job['job_id']
            status = job['status']

            # CD907(예정)이 아닌 경우에만 카운트
            if status != 'CD907':
                today_counts[job_id]["total_scheduled"] += 1
                
                # 코드 기반으로 카테고리 분류
                if status in success_codes:
                    category = 'success'
                elif status in in_progress_codes:
                    category = 'progress'
                elif status in fail_codes:
                    category = 'fail'
                else:
                    category = 'uncollected'
                    
                today_counts[job_id][category] += 1
                
                # [DEBUG] CD101 등 특정 job 로깅
                if job_id in ['CD101', 'CD102']:
                    print(f"[DEBUG-COUNT] {job_id}: status={status}, category={category}, success_codes={success_codes}, fail_codes={fail_codes}")

        return today_counts

    def _create_combined_item(self, job_id: str, hist_data: Dict, today_data: Dict) -> Dict:
        """Create a combined summary item from historical and today's data."""
        item = {
            'job_id': job_id,
            'cd_nm': hist_data.get('cd_nm'),
            'frequency': hist_data.get('frequency'),
            'min_con_dt': hist_data.get('min_con_dt'),
            'max_con_dt': hist_data.get('max_con_dt'),
            'total_count': hist_data.get('total_count', 0),
            'overall_success_count': hist_data.get('overall_success_count', 0),
            'overall_ing_count': hist_data.get('overall_ing_count', 0),
            'overall_fail_count': hist_data.get('overall_fail_count', 0),
            'overall_cd904_count': hist_data.get('overall_cd904_count', 0),
            'overall_no_data_count': hist_data.get('overall_no_data_count', 0),
            # weekly, monthly, etc.
            'week_success': hist_data.get('week_success', 0),
            'week_ing_count': hist_data.get('week_ing_count', 0),
            'week_fail_count': hist_data.get('week_fail_count', 0),
            'week_no_data_count': hist_data.get('week_no_data_count', 0),
            'month_success': hist_data.get('month_success', 0),
            'month_ing_count': hist_data.get('month_ing_count', 0),
            'month_fail_count': hist_data.get('month_fail_count', 0),
            'month_no_data_count': hist_data.get('month_no_data_count', 0),
            'half_success': hist_data.get('half_success', 0),
            'half_ing_count': hist_data.get('half_ing_count', 0),
            'half_fail_count': hist_data.get('half_fail_count', 0),
            'half_no_data_count': hist_data.get('half_no_data_count', 0),
            'year_success': hist_data.get('year_success', 0),
            'year_ing_count': hist_data.get('year_ing_count', 0),
            'year_fail_count': hist_data.get('year_fail_count', 0),
            'year_no_data_count': hist_data.get('year_no_data_count', 0),
        }

        # Override daily counts with accurate data from CollectionScheduleService
        item['day_success'] = today_data['success']
        item['day_fail_count'] = today_data['fail']
        item['day_ing_count'] = today_data['progress']
        item['day_no_data_count'] = today_data['uncollected']
        item['day_total_scheduled'] = today_data['total_scheduled']

        return item

    def _apply_settings_and_filters(self, combined_summary_data: List[Dict], settings_map: Dict[str, Dict]) -> List[Dict]:
        """Combine summary data with settings and apply dashboard display filters."""
        processed_summary_data = []
        for item in combined_summary_data:
            job_id = item.get('job_id')
            job_settings = settings_map.get(job_id, DEFAULT_ADMIN_SETTINGS)

            # Apply 'Dashboard Display Y/N' setting
            if job_settings.get('CHRT_DSP_YN', 'Y').upper() == 'N':
                logging.info(f"Skipping job '{job_id}' from dashboard summary as per CHRT_DSP_YN setting.")
                continue

            item['settings'] = job_settings
            processed_summary_data.append(item)

        return processed_summary_data

    def _add_fail_streaks(self, processed_summary_data: List[Dict]) -> None:
        """Add fail streak calculations to each item."""
        for item in processed_summary_data:
            job_id = item.get('job_id')
            if job_id:
                fail_streak = self._calculate_fail_streak(job_id)
                item['fail_streak'] = fail_streak

    def _log_final_data_counts(self, processed_summary_data: List[Dict]) -> None:
        """Log final data counts for monitoring."""
        final_total_count = len(processed_summary_data)
        final_cd101_count = sum(1 for item in processed_summary_data if item.get('job_id') == 'CD101')
        final_cd102_count = sum(1 for item in processed_summary_data if item.get('job_id') == 'CD102')
        logging.info(f"--- [DATA LOG] Dashboard - Final Data Count: Total={final_total_count}, CD101={final_cd101_count}, CD102={final_cd102_count}")

    def _calculate_fail_streak(self, job_id: str) -> int:
        """
        특정 job_id에 대한 연속 실패 횟수를 계산합니다.
        최근 10번 실행 중 실패(CD902, CD903) 상태인 횟수를 반환합니다.
        """
        try:
            query = """
                SELECT COUNT(*) as fail_count
                FROM (
                    SELECT status
                    FROM TB_CON_HIST
                    WHERE job_id = %s
                    ORDER BY start_dt DESC
                    LIMIT 10
                ) recent_runs
                WHERE status IN ('CD902', 'CD903')
            """
            with self.connection.cursor() as cur:
                cur.execute(query, (job_id,))
                result = cur.fetchone()
                return result[0] if result else 0
        except Exception as e:
            logging.error(f"연속 실패 계산 중 오류 발생 (job_id: {job_id}): {e}")
            return 0

    def get_min_max_dates(self) -> Optional[Dict]:
        return self.dashboard_mapper.get_min_max_dates()

    def get_analytics_success_rate_trend(self, start_date: Optional[str] = None, end_date: Optional[str] = None, job_ids: Optional[List[str]] = None, user: Optional[Dict] = None) -> List[Dict]:
        allowed_job_ids = self._get_allowed_job_ids(user, job_ids)
        if allowed_job_ids is not None and not allowed_job_ids:
            return []
        trend_data = self.dashboard_mapper.get_analytics_success_rate_trend(start_date, end_date, allowed_job_ids)
        return trend_data

    def get_trouble_by_code(self, start_date: Optional[str] = None, end_date: Optional[str] = None, job_ids: Optional[List[str]] = None, user: Optional[Dict] = None) -> List[Dict]:
        allowed_job_ids = self._get_allowed_job_ids(user, job_ids)
        if allowed_job_ids is not None and not allowed_job_ids:
            return []
        trouble_data = self.dashboard_mapper.get_analytics_trouble_by_code(start_date, end_date, allowed_job_ids)
        return trouble_data

    def get_raw_data(self, start_date: Optional[str] = None, end_date: Optional[str] = None, job_ids: Optional[List[str]] = None, all_data: bool = False, use_kst_today: bool = False, user: Optional[Dict] = None) -> List[Dict]:
        allowed_job_ids = self._get_allowed_job_ids(user, job_ids)
        if allowed_job_ids is not None and not allowed_job_ids:
            return []
        raw_data = self.dashboard_mapper.get_raw_data(start_date, end_date, allowed_job_ids, all_data, use_kst_today)
        return raw_data

    def get_event_log(self, start_date: Optional[str] = None, end_date: Optional[str] = None, all_data: bool = False, user: Optional[Dict] = None) -> List[Dict]:
        logging.info(f"--- [DEBUG] get_event_log called. User: {user}")

        # 1. 데이터 접근 권한 확인
        allowed_job_ids = self._get_allowed_job_ids(user)
        if allowed_job_ids is not None and not allowed_job_ids:
            logging.info(f"--- [DEBUG] User has no data permissions. Returning empty event logs.")
            return []

        # 2. 허용된 Job ID로 이벤트 로그 조회
        event_log_data = self.dashboard_mapper.get_event_log(start_date, end_date, all_data, allowed_job_ids)

        is_admin = user and 'mngr_sett' in user.get('permissions', [])
        logging.info(f"--- [DEBUG] Is admin? {is_admin}")

        # if user is admin, return all logs (but already filtered by job_ids if applicable).
        if not user or is_admin:
            logging.info(f"--- [DEBUG] Returning all {len(event_log_data)} event logs for admin or no user.")
            return event_log_data

        # if user is not admin, filter system logs.
        user_id = user.get('user_id', 'Unknown')
        logging.info(f"--- [DEBUG] Filtering logs for non-admin user '{user_id}'. Total logs before filter: {len(event_log_data)}")

        filtered_logs = []
        for log in event_log_data:
            # job_id가 None일 경우를 대비해 기본값을 빈 문자열로 설정
            job_id_str = str(log.get('job_id') or '').lower()
            status_str = str(log.get('status') or '')

            # 필터링 조건: job_id에 'system'이 포함되거나, status가 인증 관련인 경우
            is_system_by_id = 'system' in job_id_str
            is_system_by_status = status_str.startswith('AUTH_') or status_str == 'LOGIN_SUCCESS'

            if is_system_by_id or is_system_by_status:
                logging.info(f"--- [DEBUG] Filtering out log for user '{user_id}': job_id='{log.get('job_id')}', status='{status_str}'")
                continue  # 이 로그는 건너뜀

            filtered_logs.append(log)

        logging.info(f"--- [DEBUG] Total logs for user '{user_id}' after filter: {len(filtered_logs)}")
        return filtered_logs

    def get_distinct_job_ids(self, user: Optional[Dict] = None) -> List[str]:
        allowed_job_ids = self._get_allowed_job_ids(user)
        if allowed_job_ids is not None and not allowed_job_ids:
            return []
        job_ids = self.dashboard_mapper.get_distinct_job_ids(job_ids=allowed_job_ids)
        return job_ids

    def save_event(self, con_id: Optional[str], job_id: Optional[str], status: str, rqs_info: str):
        self.dashboard_mapper.save_event(con_id, job_id, status, rqs_info)

    def get_daily_job_counts(self, job_id: Optional[str], start_date: Optional[str], end_date: Optional[str], all_data: bool, user: Optional[Dict] = None) -> List[Dict]:
        allowed_job_ids = None
        if user:
            is_admin = 'mngr_sett' in user.get('permissions', [])
            user_id = user.get('user_id', 'Unknown')
            logging.info(f"Checking data permissions for user: {user_id}, is_admin: {is_admin} in get_daily_job_counts")
            if not is_admin:
                allowed_job_ids = user.get('data_permissions', [])
                logging.info(f"Non-admin user in get_daily_job_counts. Applying data permissions. Allowed jobs: {allowed_job_ids}")
                if not allowed_job_ids:
                    logging.warning(f"User {user_id} has no data permissions. Returning empty daily job counts.")
                    return []
            else:
                logging.info(f"Admin user {user_id} in get_daily_job_counts. No data permission filtering applied.")

        data = self.dashboard_mapper.get_daily_job_counts(job_id, start_date, end_date, all_data, job_ids=allowed_job_ids)
        return data

    def get_distinct_error_codes(self, start_date: Optional[str] = None, end_date: Optional[str] = None, all_data: bool = False, user: Optional[Dict] = None) -> List[str]:
        allowed_job_ids = self._get_allowed_job_ids(user)
        if allowed_job_ids is not None and not allowed_job_ids:
            return []
        error_codes = self.dashboard_mapper.get_distinct_error_codes(start_date, end_date, all_data, job_ids=allowed_job_ids)
        return error_codes

    def get_collection_history_for_schedule(self, start_date: str, end_date: str, job_ids: Optional[List[str]] = None, user: Optional[Dict] = None) -> List[Dict]:
        allowed_job_ids = self._get_allowed_job_ids(user, job_ids)
        if allowed_job_ids is not None and not allowed_job_ids:
            return []
        return self.dashboard_mapper.get_collection_history_for_schedule(start_date, end_date, allowed_job_ids)

    def get_collection_history_for_schedule_with_start_dt(self, start_date: str, end_date: str, job_ids: Optional[List[str]] = None, user: Optional[Dict] = None) -> List[Dict]:
        allowed_job_ids = self._get_allowed_job_ids(user, job_ids)
        if allowed_job_ids is not None and not allowed_job_ids:
            return []
        return self.dashboard_mapper.get_collection_history_for_schedule_with_start_dt(start_date, end_date, allowed_job_ids)
        
    def _get_allowed_job_ids(self, user: Optional[Dict], requested_job_ids: Optional[List[str]] = None) -> Optional[List[str]]:
        if not user:
            return None # Allow all if no user context is provided

        is_admin = 'mngr_sett' in user.get('permissions', [])
        if is_admin:
            return requested_job_ids

        user_permissions = set(user.get('data_permissions', []))
        if not user_permissions:
            return []

        if requested_job_ids:
            allowed = list(user_permissions.intersection(set(requested_job_ids)))
            logging.info(f"User requested {requested_job_ids}, allowed: {allowed}")
            return allowed
        
        return list(user_permissions)
        
