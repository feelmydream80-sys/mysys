import logging
from mapper.analysis_mapper import AnalysisMapper
from utils.logging_config import log_operation

from typing import Optional, Dict, List

class AnalysisService:
    def __init__(self, db_connection):
        self.conn = db_connection
        self.mapper = AnalysisMapper(db_connection)
        self.logger = logging.getLogger(self.__class__.__name__)

    def get_dynamic_chart_data(self, params: dict, user: Optional[Dict] = None) -> list[dict]:
        """
        요청 파라미터를 기반으로 동적 차트 데이터를 조회합니다.
        사용자 권한에 따라 조회 가능한 job_id를 필터링합니다.
        """
        try:
            user_id = user.get('user_id') if user else 'None'
            log_operation("분석", "차트 데이터", "요청 처리", f"사용자: {user_id}")

            allowed_job_ids = self._get_allowed_job_ids(user, params.get('job_ids'))
            if allowed_job_ids is not None and not allowed_job_ids:
                log_operation("분석", "차트 데이터", "권한 필터링", f"{len(allowed_job_ids)}개 Job ID 허용", "WARNING")
                return []

            params['job_ids'] = allowed_job_ids

            data = self.mapper.get_dynamic_chart_data(params)
            log_operation("분석", "차트 데이터", "데이터 조회", f"{len(data)}건 반환")
            return data
        except ValueError as ve:
            log_operation("분석", "차트 데이터", "파라미터 검증", f"유효하지 않음: {str(ve)}", "ERROR")
            raise
        except Exception as e:
            log_operation("분석", "차트 데이터", "데이터 조회", f"실패: {type(e).__name__}", "ERROR")
            raise

    def _get_allowed_job_ids(self, user: Optional[Dict], requested_job_ids: Optional[List[str]] = None) -> Optional[List[str]]:
        if not user or 'mngr_sett' in user.get('permissions', []):
            return requested_job_ids

        user_permissions = set(user.get('data_permissions', []))
        if not user_permissions:
            return []

        if requested_job_ids:
            allowed = list(user_permissions.intersection(set(requested_job_ids)))
            logging.info(f"User requested {requested_job_ids}, allowed: {allowed}")
            return allowed
        
        return list(user_permissions)
