# service/admin_settings_service.py
"""
Handles all business logic related to administrator settings.
"""
import logging
import random
from typing import List, Dict, Set
from mapper.mst_mapper import MstMapper
from mapper.mngr_sett_mapper import MngrSettMapper
from dao.schedule_settings_dao import ScheduleSettingsDAO
from mapper.user_mapper import UserMapper
from msys.column_mapper import convert_to_new_columns, convert_to_legacy_columns

# Default settings are defined once as a constant for consistency.
DEFAULT_ADMIN_SETTINGS = {
    'CNN_FAILR_THRS_VAL': 5,
    'CNN_WARN_THRS_VAL': 3,
    'CNN_FAILR_ICON_ID': 2,
    'CNN_FAILR_WRD_COLR': '#dc3545',
    'CNN_WARN_ICON_ID': 5,
    'CNN_WARN_WRD_COLR': '#ffc107',
    'CNN_SUCS_ICON_ID': 1,
    'CNN_SUCS_WRD_COLR': '#28a745',
    'DLY_SUCS_RT_THRS_VAL': 95.0,
    'DD7_SUCS_RT_THRS_VAL': 90.0,
    'MTHL_SUCS_RT_THRS_VAL': 85.0,
    'MC6_SUCS_RT_THRS_VAL': 80.0,
    'YY1_SUCS_RT_THRS_VAL': 75.0,
    'SUCS_RT_SUCS_ICON_ID': 1,
    'SUCS_RT_SUCS_WRD_COLR': '#28a745',
    'SUCS_RT_WARN_ICON_ID': 5,
    'SUCS_RT_WARN_WRD_COLR': '#ffc107',
    'CHRT_COLR': '#007bff',
    'CHRT_DSP_YN': 'Y',
    'GRASS_CHRT_MIN_COLR': '#9be9a8',
    'GRASS_CHRT_MAX_COLR': '#216e39'
}

def get_random_hex_color() -> str:
    """Generates a random hex color."""
    return f"#{random.randint(0, 0xFFFFFF):06x}"

class MngrSettService:
    """
    Manages business logic for admin settings, including fetching, updating,
    and ensuring data consistency.
    """
    def __init__(self, db_connection):
        # --- Local Import for avoiding circular dependencies ---
        from service.dashboard_service import DashboardService
        from service.icon_service import IconService
        
        self.conn = db_connection
        self.dashboard_service = DashboardService(db_connection)
        self.icon_service = IconService(db_connection)
        self.mngr_sett_mapper = MngrSettMapper(db_connection)
        self.mst_mapper = MstMapper(db_connection)
        self.user_mapper = UserMapper(db_connection)
        self.schedule_settings_dao = ScheduleSettingsDAO(db_connection)
        self.logger = logging.getLogger(self.__class__.__name__)

    def get_users_with_data_permissions(self, search_term: str = None) -> List[Dict]:
        """
        Fetches all users with their assigned data permissions (Job IDs).
        Filters by user_id or user_nm if a search term is provided.
        """
        try:
            self.logger.info(f"Service: 데이터 접근 권한과 함께 사용자 목록 조회 (검색어: '{search_term}').")
            users = self.user_mapper.find_all_users_with_data_permissions(search_term)
            
            # JOB_IDS가 null인 경우 빈 리스트로 변환
            for user in users:
                if user['job_ids'] is None:
                    user['job_ids'] = []
                else:
                    # JSON 문자열을 실제 리스트로 파싱
                    import json
                    user['job_ids'] = json.loads(user['job_ids'])
            
            return users
        except Exception as e:
            self.logger.error(f"Service: 데이터 접근 권한 사용자 목록 조회 실패: {e}", exc_info=True)
            raise

    def get_jobs_for_permission_setting(self, user_id: str) -> Dict:
        """
        For a given user, fetches all available Job IDs and the ones they are permitted to access.
        """
        try:
            self.logger.info(f"Service: '{user_id}' 사용자의 Job ID 권한 설정 데이터 조회.")
            all_jobs = self.mst_mapper.get_all_job_ids() # 이제 dict의 list를 반환합니다.
            permitted_job_ids = self.user_mapper.find_data_permissions_by_user_id(user_id)
            # Job ID를 오름차순으로 정렬
            permitted_job_ids = sorted(permitted_job_ids) if permitted_job_ids else []
            
            return {
                "all_jobs": all_jobs,
                "allowed_job_ids": permitted_job_ids
            }
        except Exception as e:
            self.logger.error(f"Service: Job ID 권한 설정 데이터 조회 실패: {e}", exc_info=True)
            raise

    def save_data_permissions(self, user_id: str, job_ids: List[str]):
        """
        Saves the data access permissions for a specific user.
        This involves deleting all existing permissions and then inserting the new ones.
        """
        try:
            self.logger.info(f"Service: '{user_id}' 사용자의 데이터 접근 권한 저장 시작.")
            self.logger.info(f"--- Service: 전달받은 user_id: {user_id}")
            self.logger.info(f"--- Service: 전달받은 job_ids: {job_ids}")
            # 1. 기존 권한 삭제
            self.user_mapper.delete_data_permissions_by_user_id(user_id)
            self.logger.info(f"Service: '{user_id}' 사용자의 기존 데이터 접근 권한 삭제 완료.")

            # 2. 새로운 권한 추가
            if job_ids:
                for job_id in job_ids:
                    self.user_mapper.insert_data_permission(user_id, job_id)
                self.logger.info(f"Service: '{user_id}' 사용자에게 {len(job_ids)}개의 신규 데이터 접근 권한 추가 완료.")
            else:
                self.logger.info(f"Service: '{user_id}' 사용자에게 할당된 데이터 접근 권한이 없습니다.")
                
        except Exception as e:
            self.logger.error(f"Service: 데이터 접근 권한 저장 실패: {e}", exc_info=True)
            raise

    def insert_or_update_settings(self, settings_data: dict):
        """
        Inserts or updates settings for a single Job ID.
        Applies default values for new settings.
        """
        try:
            mapper = self.mngr_sett_mapper
            converted_settings = convert_to_new_columns('TB_MNGR_SETT', settings_data)
            job_cd = converted_settings.get('cd')

            existing_settings = mapper.get_settings_by_cd(job_cd)
            
            if existing_settings:
                self.logger.info(f"Service: 기존 설정 업데이트 (CD: {job_cd})")
                mapper.insert_or_update_settings(settings_data)
            else:
                self.logger.info(f"Service: 신규 설정 삽입 (CD: {job_cd})")
                default_settings_new_keys = convert_to_new_columns('TB_MNGR_SETT', DEFAULT_ADMIN_SETTINGS)
                final_settings = {**default_settings_new_keys, **converted_settings}
                if job_cd:
                    final_settings['cd'] = job_cd
                
                final_settings_legacy = convert_to_legacy_columns('TB_MNGR_SETT', final_settings)
                mapper.insert_or_update_settings(final_settings_legacy)

            job_cd_for_log = converted_settings.get('cd', settings_data.get('sett_id', 'N/A'))
            self.logger.info(f"Service: Admin settings for {job_cd_for_log} saved successfully.")
        except Exception as e:
            job_cd_for_log = settings_data.get('sett_id', 'N/A')
            self.logger.error(f"Service: Failed to save/update settings for {job_cd_for_log}: {e}", exc_info=True)
            raise

    def get_all_settings(self) -> list[dict]:
        """
        Fetches all admin settings, ensuring consistency by creating default settings
        for jobs that have history but no settings record.
        """
        self.logger.info("=== Service: get_all_settings() 시작 ===")
        try:
            # Use existing connection instead of creating new ones
            mapper = self.mngr_sett_mapper
            self.logger.info("Service: dashboard_service.get_summary(all_data=True) 호출")
            con_hist_summary = self.dashboard_service.get_summary(all_data=True)
            self.logger.info(f"Service: con_hist_summary length: {len(con_hist_summary)}")
            if con_hist_summary:
                job_ids = [item['job_id'] for item in con_hist_summary if item['job_id']]
                self.logger.info(f"Service: Job IDs in con_hist_summary: {job_ids}")

            self.logger.info("Service: _ensure_settings_for_all_jobs_with_history() 호출")
            self._ensure_settings_for_all_jobs_with_history(self.conn, con_hist_summary)

            all_settings_raw = mapper.get_all_settings()
            self.logger.info(f"Service: all_settings_raw length: {len(all_settings_raw)}")
            all_icons = self.icon_service.get_all_icons_data()
            self.logger.info(f"Service: all_icons length: {len(all_icons)}")

            result = self._combine_settings_details(all_settings_raw, con_hist_summary, all_icons)
            self.logger.info(f"=== Service: get_all_settings() 완료. 반환 개수: {len(result)} ===")
            return result
        except Exception as e:
            self.logger.error(f"Service: Failed to get all settings: {e}", exc_info=True)
            return []

    def _ensure_settings_for_all_jobs_with_history(self, conn, con_hist_summary):
        """
        Ensures that any job with a history record that also exists in the master job list (TB_CON_MST)
        has a corresponding admin setting. If not, a default setting is created.
        Filters out any jobs with NULL job_id to prevent invalid settings creation.
        """
        self.logger.info("=== Service: _ensure_settings_for_all_jobs_with_history() 시작 ===")
        mapper = MngrSettMapper(conn)

        # 1. Get all unique job IDs from the execution history (TB_CON_HIST), excluding NULL/empty values.
        all_hist_job_ids = {item['job_id'] for item in con_hist_summary
                           if item.get('job_id') is not None and str(item.get('job_id', '')).strip()}
        null_job_count = len([item for item in con_hist_summary
                             if not item.get('job_id') or not str(item.get('job_id', '')).strip()])
        self.logger.info(f"Service: all_hist_job_ids: {all_hist_job_ids}")
        if null_job_count > 0:
            self.logger.warning(f"Service: Filtered out {null_job_count} items with NULL/empty job_id from history summary.")

        # 2. Get all existing job IDs from the admin settings (TB_MNGR_SETT).
        existing_admin_settings = mapper.get_all_settings()
        existing_admin_job_ids = {setting['cd'] for setting in existing_admin_settings}
        self.logger.info(f"Service: existing_admin_job_ids: {existing_admin_job_ids}")

        # 3. Get all valid job IDs from the master job list (TB_CON_MST).
        all_mst_job_ids = {job['cd'] for job in self.mst_mapper.get_all_job_ids()}
        self.logger.info(f"Service: all_mst_job_ids: {all_mst_job_ids}")

        # Determine which jobs from history are missing settings.
        hist_jobs_missing_settings = all_hist_job_ids - existing_admin_job_ids
        self.logger.info(f"Service: hist_jobs_missing_settings: {hist_jobs_missing_settings}")

        # Filter this list to include only jobs that are also in the master list.
        jobs_to_create_settings_for = hist_jobs_missing_settings.intersection(all_mst_job_ids)
        self.logger.info(f"Service: jobs_to_create_settings_for: {jobs_to_create_settings_for}")

        if jobs_to_create_settings_for:
            self.logger.info(f"Service: Found {len(jobs_to_create_settings_for)} jobs that need default settings created.")

            existing_colors = {setting['chrt_colr'] for setting in existing_admin_settings if setting.get('chrt_colr')}

            for job_id in jobs_to_create_settings_for:
                # Final validation: ensure job_id is not null/empty before creating settings
                if not job_id or not str(job_id).strip():
                    self.logger.warning(f"Service: Skipping settings creation for invalid job_id: {job_id}")
                    continue

                new_setting_data = {'sett_id': job_id, **DEFAULT_ADMIN_SETTINGS}

                # Assign a unique random color for the chart.
                new_color = get_random_hex_color()
                while new_color in existing_colors:
                    new_color = get_random_hex_color()

                new_setting_data['CHRT_COLR'] = new_color
                existing_colors.add(new_color)

                self.logger.info(f"Service: Creating settings for job_id: {job_id}")
                self.logger.info(f"Service: new_setting_data keys: {list(new_setting_data.keys())}")
                self.logger.info(f"Service: new_setting_data['sett_id']: {new_setting_data.get('sett_id')}")
                try:
                    mapper.insert_or_update_settings(new_setting_data)
                except Exception as e:
                    self.logger.error(f"Service: Failed to create settings for job_id {job_id}: {e}")
                    continue

            self.logger.info(f"Service: Default settings created for: {jobs_to_create_settings_for}")
        else:
            self.logger.info("Service: No jobs need default settings created.")

        self.logger.info("=== Service: _ensure_settings_for_all_jobs_with_history() 완료 ===")

    def _combine_settings_details(self, all_settings_raw: List[Dict], con_hist_summary: List[Dict], all_icons: List[Dict]) -> List[Dict]:
        hist_count_map = {item['job_id']: item['total_count'] for item in con_hist_summary}
        icon_code_map = {icon['icon_id']: icon['icon_cd'] for icon in all_icons}
        
        final_settings_list = []
        
        for setting_raw in all_settings_raw:
            job_id = setting_raw['cd']
            total_count = hist_count_map.get(job_id, 0)
            
            combined_setting = setting_raw.copy()
            combined_setting['total_count'] = total_count
            
            icon_fields = [
                'CNN_FAILR_ICON_ID', 'CNN_WARN_ICON_ID', 'CNN_SUCS_ICON_ID',
                'SUCS_RT_SUCS_ICON_ID', 'SUCS_RT_WARN_ICON_ID'
            ]
            for field in icon_fields:
                icon_id = combined_setting.get(field)
                combined_setting[f'{field}_code'] = icon_code_map.get(icon_id)
            
            final_settings_list.append(combined_setting)
        
        final_settings_list.sort(key=lambda x: x['cd'])
        return final_settings_list

    def delete_settings(self, cd: str):
        try:
            mapper = self.mngr_sett_mapper
            self.logger.info(f"Service: 설정 삭제 요청 (CD: {cd})")
            mapper.delete_settings(cd)
            self.logger.info(f"Service: Admin settings for {cd} deleted successfully.")
        except Exception as e:
            self.logger.error(f"Service: Failed to delete settings for {cd}: {e}", exc_info=True)
            raise

    def import_settings(self, settings_list: List[Dict]):
        try:
            self.logger.info(f"Service: Importing {len(settings_list)} settings.")
            for settings_data in settings_list:
                self.insert_or_update_settings(settings_data)
            self.logger.info("Service: Batch import of admin settings successful.")
        except Exception as e:
            self.logger.error(f"Service: Batch import failed: {e}", exc_info=True)
            raise

    def export_settings(self) -> List[Dict]:
        try:
            mapper = self.mngr_sett_mapper
            self.logger.info("Service: Exporting all admin settings.")
            settings = mapper.get_all_settings()
            self.logger.info(f"Service: Exported {len(settings)} settings successfully.")
            return settings
        except Exception as e:
            self.logger.error(f"Service: Failed to export settings: {e}", exc_info=True)
            raise

    def get_menu_settings(self) -> List[Dict]:
        """
        Fetches all menu settings from the database.
        """
        try:
            self.logger.info("Service: Fetching all menu settings.")
            menu_settings = self.mngr_sett_mapper.get_all_menu_settings()
            self.logger.info(f"Service: Fetched {len(menu_settings)} menu items successfully.")
            return menu_settings
        except Exception as e:
            self.logger.error(f"Service: Failed to fetch menu settings: {e}", exc_info=True)
            raise

    def get_schedule_settings_service(self) -> Dict:
        """
        Service layer to fetch schedule settings.
        The DAO now returns the data with icon codes already joined.
        """
        self.logger.info("=== SERVICE: get_schedule_settings_service() 시작 ===")

        try:
            # DAO 호출 전 상태 로깅
            self.logger.info("SERVICE: DAO 호출 준비")
            if not hasattr(self, 'schedule_settings_dao') or self.schedule_settings_dao is None:
                self.logger.error("SERVICE: schedule_settings_dao가 초기화되지 않음")
                raise ValueError("ScheduleSettingsDAO not initialized")

            # DAO 호출
            self.logger.info("SERVICE: DAO.get_schedule_settings() 호출")
            settings = self.schedule_settings_dao.get_schedule_settings()
            self.logger.info(f"SERVICE: DAO 호출 완료. 반환 타입: {type(settings)}")

            if settings is None:
                self.logger.warning("SERVICE: DAO에서 None 반환. 스케줄 설정 데이터가 없음")
                return None

            if not isinstance(settings, dict):
                self.logger.error(f"SERVICE: DAO에서 예상치 못한 타입 반환: {type(settings)}")
                raise ValueError(f"Expected dict from DAO, got {type(settings)}")

            self.logger.info(f"SERVICE: DAO에서 {len(settings)}개의 필드 데이터 수신")
            self.logger.debug(f"SERVICE: 수신된 데이터 키들: {list(settings.keys())}")

            # 데이터 변환 전 검증
            self.logger.info("SERVICE: 데이터 변환 시작 (snake_case -> camelCase)")

            # 변환할 필드 매핑
            field_mapping = {
                'sett_id': 'settId',
                'grp_min_cnt': 'grpMinCnt',
                'prgs_rt_red_thrsval': 'prgsRtRedThrsval',
                'prgs_rt_org_thrsval': 'prgsRtOrgThrsval',
                'succ_rt_red_thrsval': 'succRtRedThrsval',
                'succ_rt_org_thrsval': 'succRtOrgThrsval',
                'use_yn': 'useYn',
                'grp_brdr_styl': 'grpBrdrStyl',
                'grp_colr_crtr': 'grpColrCrtr',
                'sucs_icon_id': 'sucsIconId',
                'sucs_icon_cd': 'sucsIconCd',
                'sucs_bg_colr': 'sucsBgColr',
                'sucs_txt_colr': 'sucsTxtColr',
                'fail_icon_id': 'failIconId',
                'fail_icon_cd': 'failIconCd',
                'fail_bg_colr': 'failBgColr',
                'fail_txt_colr': 'failTxtColr',
                'prgs_icon_id': 'prgsIconId',
                'prgs_icon_cd': 'prgsIconCd',
                'prgs_bg_colr': 'prgsBgColr',
                'prgs_txt_colr': 'prgsTxtColr',
                'nodt_icon_id': 'nodtIconId',
                'nodt_icon_cd': 'nodtIconCd',
                'nodt_bg_colr': 'nodtBgColr',
                'nodt_txt_colr': 'nodtTxtColr',
                'schd_icon_id': 'schdIconId',
                'schd_icon_cd': 'schdIconCd',
                'schd_bg_colr': 'schdBgColr',
                'schd_txt_colr': 'schdTxtColr',
                'grp_prgs_icon_id': 'grpPrgsIconId',
                'grp_prgs_icon_cd': 'grpPrgsIconCd',
                'grp_sucs_icon_id': 'grpSucsIconId',
                'grp_sucs_icon_cd': 'grpSucsIconCd'
            }

            # 데이터 변환
            converted_settings = {}
            for db_field, frontend_field in field_mapping.items():
                value = settings.get(db_field)

                # Decimal 타입을 float로 변환 (JSON 직렬화 문제 해결)
                if hasattr(value, '__class__') and 'Decimal' in str(type(value)):
                    from decimal import Decimal
                    if isinstance(value, Decimal):
                        value = float(value)
                        self.logger.debug(f"SERVICE: Decimal 변환 - {db_field}: {value}")

                converted_settings[frontend_field] = value

                # 타입별로 특별한 처리
                if value is None:
                    self.logger.debug(f"SERVICE: 필드 {db_field} -> {frontend_field}: None")
                elif isinstance(value, (int, float)):
                    self.logger.debug(f"SERVICE: 필드 {db_field} -> {frontend_field}: {value} ({type(value).__name__})")
                elif isinstance(value, str):
                    # 민감한 정보는 길이만 로깅
                    if len(value) > 50:
                        self.logger.debug(f"SERVICE: 필드 {db_field} -> {frontend_field}: [길이 {len(value)}자 문자열]")
                    else:
                        self.logger.debug(f"SERVICE: 필드 {db_field} -> {frontend_field}: '{value}'")
                else:
                    self.logger.debug(f"SERVICE: 필드 {db_field} -> {frontend_field}: {type(value).__name__} 타입")

            self.logger.info(f"SERVICE: 데이터 변환 완료. {len(converted_settings)}개 필드 변환됨")
            self.logger.info("=== SERVICE: get_schedule_settings_service() 성공 완료 ===")

            return converted_settings

        except Exception as e:
            self.logger.error(f"SERVICE: 스케줄 설정 조회 중 예외 발생: {e}", exc_info=True)
            # 추가 디버깅 정보
            try:
                import traceback
                self.logger.error(f"SERVICE: 스택 트레이스:\n{traceback.format_exc()}")
            except Exception:
                pass
            raise
    
    def save_schedule_settings_service(self, settings_data: Dict, user_id: str):
        """
        Service layer to save schedule settings.
        It decides whether to create a new record or update an existing one.
        """
        try:
            sett_id = settings_data.get('sett_id')
            self.logger.info(f"Service: Saving schedule settings. sett_id: {sett_id}, user_id: {user_id}")

            # Add user_id for tracking who made the changes
            settings_data['updr_id'] = user_id
            
            if sett_id:
                self.logger.info(f"--- Service: Calling DAO to update with data: {settings_data}")
                self.schedule_settings_dao.update_schedule_settings(settings_data)
                self.logger.info(f"Service: Successfully updated settings for sett_id: {sett_id}")
                return {'message': '설정이 성공적으로 업데이트되었습니다.', 'sett_id': sett_id}
            else:
                settings_data['regr_id'] = user_id
                self.logger.info(f"--- Service: Calling DAO to create with data: {settings_data}")
                new_id = self.schedule_settings_dao.create_schedule_settings(settings_data)
                self.logger.info(f"Service: Successfully created new settings with sett_id: {new_id}")
                return {'message': '설정이 성공적으로 생성되었습니다.', 'sett_id': new_id}
        except Exception as e:
            self.logger.error(f"Service: Failed to save schedule settings: {e}", exc_info=True)
            raise
