# service/admin_settings_service.py
"""
Handles all business logic related to administrator settings.
"""
import logging
import random
from typing import List, Dict, Set, Union
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

                new_setting_data = {'job_id': job_id, **DEFAULT_ADMIN_SETTINGS}

                # Assign a unique random color for the chart.
                new_color = get_random_hex_color()
                while new_color in existing_colors:
                    new_color = get_random_hex_color()

                new_setting_data['CHRT_COLR'] = new_color
                existing_colors.add(new_color)

                self.logger.info(f"Service: Creating settings for job_id: {job_id}")
                self.logger.info(f"Service: new_setting_data keys: {list(new_setting_data.keys())}")
                self.logger.info(f"Service: new_setting_data['job_id']: {new_setting_data.get('job_id')}")
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

    def sync_settings_with_mst(self) -> Dict:
        """
        tb_con_mst의 모든 job을 tb_mngr_sett와 동기화합니다.
        tb_mngr_sett에 존재하지 않는 job에 대해 기본 설정을 생성하고,
        TB_API_KEY_MNGR에 없는 CD 값도 추가합니다.
        """
        self.logger.info("=== Service: sync_settings_with_mst() 시작 ===")
        try:
            # 1. tb_con_mst에서 모든 job_id 가져오기
            all_mst_job_ids = {job['cd'] for job in self.mst_mapper.get_all_job_ids()}
            self.logger.info(f"Service: tb_con_mst에 있는 모든 Job ID: {all_mst_job_ids}")

            # 2. tb_mngr_sett에서 기존 job_id 가져오기
            existing_settings = self.mngr_sett_mapper.get_all_settings()
            existing_job_ids = {setting['cd'] for setting in existing_settings}
            self.logger.info(f"Service: tb_mngr_sett에 있는 기존 Job ID: {existing_job_ids}")

            # 3. tb_mngr_sett에 없는 job_id 찾기
            missing_job_ids = all_mst_job_ids - existing_job_ids
            self.logger.info(f"Service: tb_mngr_sett에 없는 Job ID: {missing_job_ids}")

            # 4. 제외할 job_id 필터링 (CD900~CD999, CD100, CD200 등)
            jobs_to_create = []
            for job_id in missing_job_ids:
                if not self._should_exclude_job(job_id):
                    jobs_to_create.append(job_id)
            self.logger.info(f"Service: 생성할 Job ID: {jobs_to_create}")

            # 5. 새로운 job에 기본 설정 생성
            created_count = 0
            existing_colors = {setting['chrt_colr'] for setting in existing_settings if setting.get('chrt_colr')}
            
            for job_id in jobs_to_create:
                new_setting = {'cd': job_id, **DEFAULT_ADMIN_SETTINGS}
                
                # 고유한 차트 색상 할당
                new_color = get_random_hex_color()
                while new_color in existing_colors:
                    new_color = get_random_hex_color()
                
                new_setting['chrt_colr'] = new_color
                existing_colors.add(new_color)
                
                self.mngr_sett_mapper.insert_or_update_settings(new_setting)
                created_count += 1
                self.logger.info(f"Service: Job ID {job_id}의 설정 생성 완료")

            # 6. TB_API_KEY_MNGR에 CD 값 추가 (API 키 관리 테이블에 없는 CD만 추가)
            from service.api_key_mngr_service import ApiKeyMngrService
            api_key_service = ApiKeyMngrService()
            api_update_result = api_key_service.update_cd_from_mngr_sett()
            
            # 7. 이벤트 로그에 기록
            from service.dashboard_service import DashboardService
            dashboard_service = DashboardService(self.conn)
            
            # 기본 설정 생성 이벤트 로그
            for job_id in jobs_to_create:
                dashboard_service.save_event(
                    con_id=None,
                    job_id=job_id,
                    status='SETTINGS_CREATED',
                    rqs_info=f'관리자 설정>기본 설정 {job_id} 추가'
                )
            
            # API 키 관리 업데이트 이벤트 로그
            for cd in api_update_result['added_cds']:
                dashboard_service.save_event(
                    con_id=None,
                    job_id=cd,
                    status='API_KEY_UPDATED',
                    rqs_info=f'API 키 관리 {cd} 추가'
                )
            
            self.logger.info(f"=== Service: sync_settings_with_mst() 완료. 기본 설정 생성: {created_count}개, API 업데이트: {len(api_update_result['added_cds'])}개 ===")
            
            return {
                'created_count': created_count,
                'api_updated_count': len(api_update_result['added_cds']),
                'total_mst_jobs': len(all_mst_job_ids),
                'total_settings': len(existing_job_ids) + created_count,
                'jobs_created': jobs_to_create,
                'api_updated_cds': api_update_result['added_cds']
            }
        except Exception as e:
            self.logger.error(f"Service: sync_settings_with_mst() 실패: {e}", exc_info=True)
            raise

    def _should_exclude_job(self, job_id):
        """설정 생성을 제외해야 할 job_id인지 확인합니다."""
        if not job_id or not str(job_id).strip():
            return True
        
        job_id = str(job_id).upper()
        
        # CD900~CD999 범위 제외
        if job_id.startswith('CD') and len(job_id) > 2:
            try:
                cd_number = int(job_id[2:])
                if (cd_number >= 900 and cd_number <= 999) or (cd_number % 100 == 0):
                    return True
            except ValueError:
                pass
        
        return False

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
                'memo_bg_colr': 'memoBgColr',
                'memo_txt_colr': 'memoTxtColr'
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
     
    def save_status_code_service(self, status_data: Union[dict, list]):
        """
        상태코드 저장 서비스
        
        Args:
            status_data: 단일 상태코드 데이터 또는 상태코드 데이터 리스트
                단일: {
                    'cd': 'CD901',
                    'nm': '성공',
                    'descr': 'Total Finished',
                    'colr': '#28a745',
                    'icon_cd': '✅',
                    'ord': 901,
                    'use_yn': 'Y'
                }
                리스트: [{...}, {...}, ...]
        """
        try:
            # 리스트인 경우 각 항목을 개별적으로 처리
            if isinstance(status_data, list):
                self.logger.info(f"Service: 상태코드 배치 저장 시작 - 총 {len(status_data)}개")
                for item in status_data:
                    self._save_single_status_code(item)
                self.logger.info(f"Service: 상태코드 배치 저장 완료 - 총 {len(status_data)}개")
            else:
                self._save_single_status_code(status_data)
                
        except Exception as e:
            self.logger.error(f"Service: 상태코드 저장 실패: {e}", exc_info=True)
            raise
    
    def _save_single_status_code(self, status_data: dict):
        """단일 상태코드 저장 (내부 메서드)"""
        try:
            cd = status_data.get('cd', 'UNKNOWN')
            self.logger.info(f"Service: 상태코드 저장 시작 - CD: {cd}")
            
            processed_data = status_data.copy()
            
            if 'icon_id' in processed_data and processed_data['icon_id']:
                icon_id = processed_data['icon_id']
                icon_code = self.icon_service.get_icon_code_by_id(icon_id)
                if icon_code:
                    processed_data['icon_cd'] = icon_code
                    self.logger.info(f"Service: icon_id({icon_id}) → icon_cd({icon_code}) 변환 완료")
                else:
                    self.logger.warning(f"Service: icon_id({icon_id})에 해당하는 icon_code를 찾을 수 없음")
            
            from dao.sts_cd_dao import StsCdDAO
            StsCdDAO.upsert_status_code(processed_data)
            
            self.logger.info(f"Service: 상태코드 저장 완료 - CD: {cd}")
            
        except Exception as e:
            cd = status_data.get('cd', 'UNKNOWN')
            self.logger.error(f"Service: 단일 상태코드 저장 실패 - CD: {cd}: {e}", exc_info=True)
            raise
    
    def get_status_codes_service(self) -> List[Dict]:
        """
        상태코드 목록 조회 서비스
        tb_sts_cd_mst 테이블에서 모든 사용 가능한 상태코드를 조회합니다.
        
        Returns:
            List[Dict]: 상태코드 목록 (cd, nm, descr, colr, icon_cd, ord 포함)
        """
        try:
            self.logger.info("=== SERVICE: get_status_codes_service() 시작 ===")
            from dao.sts_cd_dao import StsCdDAO
            status_codes = StsCdDAO.get_all()
            self.logger.info(f"SERVICE: 상태코드 {len(status_codes)}개 조회 완료")
            return status_codes
        except Exception as e:
            self.logger.error(f"SERVICE: 상태코드 조회 실패: {e}", exc_info=True)
            return []
    
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

    def get_all_settings_paged(self, page: int = 1, per_page: int = 10, search_term: str = None) -> dict:
        """
        페이징 및 검색이 적용된 관리자 설정 데이터를 조회합니다.
        """
        self.logger.info(f"Service: get_all_settings_paged() 호출 - page: {page}, per_page: {per_page}, search_term: {search_term}")
        try:
            mapper = self.mngr_sett_mapper
            result = mapper.get_all_settings_paged(page, per_page, search_term)
            
            # 아이콘 데이터 추가 (기존 _combine_settings_details 로직 활용)
            all_icons = self.icon_service.get_all_icons_data()
            icon_code_map = {icon['icon_id']: icon['icon_cd'] for icon in all_icons}
            
            # 데이터에 아이콘 코드 추가
            for setting in result['data']:
                icon_fields = [
                    'CNN_FAILR_ICON_ID', 'CNN_WARN_ICON_ID', 'CNN_SUCS_ICON_ID',
                    'SUCS_RT_SUCS_ICON_ID', 'SUCS_RT_WARN_ICON_ID'
                ]
                for field in icon_fields:
                    icon_id = setting.get(field)
                    if icon_id:
                        setting[f'{field}_code'] = icon_code_map.get(icon_id)
            
            self.logger.info(f"Service: get_all_settings_paged() 완료 - total: {result['total']}, page: {result['page']}")
            return result
        except Exception as e:
            self.logger.error(f"Service: Failed to get paged settings: {e}", exc_info=True)
            return {'data': [], 'total': 0, 'page': page, 'per_page': per_page, 'total_pages': 0}
