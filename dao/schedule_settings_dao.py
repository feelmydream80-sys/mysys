# dao/schedule_settings_dao.py
import logging
from typing import Dict, Optional
from utils.logging_config import log_operation

class ScheduleSettingsDAO:
    def __init__(self, db_connection):
        self.conn = db_connection
        self.logger = logging.getLogger(self.__class__.__name__)

    def _execute_query(self, query: str, params: tuple = (), fetch_one: bool = False):
        self.logger.debug(f"DAO: _execute_query 호출. fetch_one={fetch_one}, params 개수={len(params)}")

        try:
            with self.conn.cursor() as cursor:
                self.logger.debug("DAO: 커서 생성 성공")

                # 쿼리 실행
                cursor.execute(query, params)
                self.logger.debug("DAO: 쿼리 실행 성공")

                if fetch_one:
                    self.logger.debug("DAO: fetch_one 모드로 단일 행 조회")
                    row = cursor.fetchone()

                    if row:
                        columns = [desc[0] for desc in cursor.description]
                        result = dict(zip(columns, row))
                        self.logger.debug(f"DAO: 단일 행 조회 성공. 컬럼 수: {len(columns)}")
                        return result
                    else:
                        self.logger.debug("DAO: 단일 행 조회 결과 없음")
                        return None

                else:
                    self.logger.debug("DAO: fetchall 모드로 다중 행 조회")
                    rows = cursor.fetchall()

                    if not rows:
                        self.logger.debug("DAO: 다중 행 조회 결과 없음")
                        return []

                    columns = [desc[0] for desc in cursor.description]
                    results = [dict(zip(columns, row)) for row in rows]
                    self.logger.debug(f"DAO: 다중 행 조회 성공. 행 수: {len(results)}, 컬럼 수: {len(columns)}")
                    return results

        except Exception as e:
            self.logger.error(f"DAO: _execute_query 실행 중 오류: {e}", exc_info=True)
            raise

    def get_schedule_settings(self) -> Optional[Dict]:
        """
        Fetches the latest schedule display settings from the database.
        The SQL now joins with the icon table to get the icon codes directly.
        """
        self.logger.info("=== DAO: get_schedule_settings() 시작 ===")
        try:
            # SQL 파일 존재 여부 확인
            #sql_file_path = 'sql/mngr_sett/get_schedule_settings.sql'
            #self.logger.info(f"DAO: SQL 파일 경로 확인: {sql_file_path}")

            #with open(sql_file_path, 'r', encoding='utf-8') as f:
             #   query = f.read()


            from dao.sql_loader import load_sql
            query = load_sql('mngr_sett/get_schedule_settings.sql')
            log_operation("관리자설정", "스케줄설정", "SQL 파일 로드", f"성공: {len(query)}자")

            # 쿼리 실행
            log_operation("관리자설정", "스케줄설정", "데이터 조회", "실행 시작")
            settings = self._execute_query(query, fetch_one=True)
            result_type = "데이터 있음" if settings else "데이터 없음"
            log_operation("관리자설정", "스케줄설정", "데이터 조회", f"완료: {result_type}")

            if settings is None:
                log_operation("관리자설정", "스케줄설정", "데이터 확인", "데이터 없음", "WARNING")
                return None
            elif isinstance(settings, dict):
                log_operation("관리자설정", "스케줄설정", "데이터 반환", f"{len(settings)}개 필드")
                # 민감한 정보 제외하고 주요 키들 로깅 (디버그 모드에서만)
                safe_keys = ['sett_id', 'grp_min_cnt', 'use_yn', 'grp_brdr_styl', 'grp_colr_crtr']
                log_info = {k: v for k, v in settings.items() if k in safe_keys}
                log_operation("관리자설정", "스케줄설정", "주요 설정", f"sett_id: {settings.get('sett_id')}", "DEBUG", log_info)
            else:
                log_operation("관리자설정", "스케줄설정", "데이터 타입", f"예상치 못함: {type(settings)}", "WARNING")

            log_operation("관리자설정", "스케줄설정", "조회 완료", "성공")
            return settings

        except FileNotFoundError as e:
            log_operation("관리자설정", "스케줄설정", "SQL 파일 로드", "파일 없음", "ERROR")
            raise
        except UnicodeDecodeError as e:
            log_operation("관리자설정", "스케줄설정", "SQL 파일 로드", "인코딩 오류", "ERROR")
            raise
        except Exception as e:
            log_operation("관리자설정", "스케줄설정", "데이터 조회", f"실패: {type(e).__name__}", "ERROR")
            raise

    def update_schedule_settings(self, settings_data: Dict):
        """
        Updates an existing schedule settings record.
        """
        try:
            from dao.sql_loader import load_sql
            query = load_sql('mngr_sett/update_schedule_settings.sql')
            sett_id = settings_data.get('sett_id')

            log_operation("관리자설정", "스케줄설정", "업데이트 시작", f"sett_id: {sett_id}")

            # Ensure all keys are present, providing defaults if necessary
            params = {
                'grp_min_cnt': settings_data.get('grp_min_cnt'),
                'prgs_rt_red_thrsval': settings_data.get('prgs_rt_red_thrsval'),
                'prgs_rt_org_thrsval': settings_data.get('prgs_rt_org_thrsval'),
                'succ_rt_red_thrsval': settings_data.get('succ_rt_red_thrsval'),
                'succ_rt_org_thrsval': settings_data.get('succ_rt_org_thrsval'),
                'use_yn': settings_data.get('use_yn'),
                'grp_brdr_styl': settings_data.get('grp_brdr_styl'),
                'grp_colr_crtr': settings_data.get('grp_colr_crtr'),
                'grp_prgs_icon_id': settings_data.get('grp_prgs_icon_id'),
                'grp_sucs_icon_id': settings_data.get('grp_sucs_icon_id'),
                'updr_id': settings_data.get('updr_id'),
                'sett_id': settings_data.get('sett_id')
            }

            with self.conn.cursor() as cursor:
                cursor.execute(query, params)

            log_operation("관리자설정", "스케줄설정", "업데이트 완료", f"sett_id: {sett_id}")

        except Exception as e:
            sett_id = settings_data.get('sett_id', 'Unknown')
            log_operation("관리자설정", "스케줄설정", "업데이트 실패", f"sett_id: {sett_id}, 오류: {type(e).__name__}", "ERROR")
            raise

    def create_schedule_settings(self, settings_data: Dict) -> int:
        """
        Creates a new schedule settings record and returns the new sett_id.
        """
        try:
            from dao.sql_loader import load_sql
            query = load_sql('mngr_sett/create_schedule_settings.sql')

            log_operation("관리자설정", "스케줄설정", "생성 시작", "새 레코드")

            params = {
                'grp_min_cnt': settings_data.get('grp_min_cnt'),
                'prgs_rt_red_thrsval': settings_data.get('prgs_rt_red_thrsval'),
                'prgs_rt_org_thrsval': settings_data.get('prgs_rt_org_thrsval'),
                'succ_rt_red_thrsval': settings_data.get('succ_rt_red_thrsval'),
                'succ_rt_org_thrsval': settings_data.get('succ_rt_org_thrsval'),
                'use_yn': settings_data.get('use_yn'),
                'grp_brdr_styl': settings_data.get('grp_brdr_styl'),
                'grp_colr_crtr': settings_data.get('grp_colr_crtr'),
                'grp_prgs_icon_id': settings_data.get('grp_prgs_icon_id'),
                'grp_sucs_icon_id': settings_data.get('grp_sucs_icon_id'),
                'regr_id': settings_data.get('regr_id'),
                'updr_id': settings_data.get('updr_id')
            }

            with self.conn.cursor() as cursor:
                cursor.execute(query, params)
                new_id = cursor.lastrowid

            log_operation("관리자설정", "스케줄설정", "생성 완료", f"sett_id: {new_id}")
            return new_id
        except Exception as e:
            log_operation("관리자설정", "스케줄설정", "생성 실패", f"오류: {type(e).__name__}", "ERROR")
            raise
