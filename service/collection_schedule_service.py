from msys.database import get_db_connection
from mapper.mst_mapper import MstMapper
from mapper.user_mapper import UserMapper
from mapper.dashboard_mapper import DashboardMapper

from datetime import datetime, timedelta
import croniter
import pytz
import re
from typing import Optional, Dict, List
from flask import current_app


class CollectionScheduleService:
    def __init__(self, conn):
        self.conn = conn

    def get_schedule_only(self, start_date, end_date, user: Optional[Dict] = None) -> List[Dict]:
        """
        주어진 기간 동안의 데이터 수집 스케줄을 반환합니다.
        사용자 권한에 따라 표시되는 Job이 필터링됩니다.
        cron 기반 스케줄을 생성하고 히스토리와 매칭하여 실제 상태를 표시합니다.
        스케줄 외 실행은 표시하지 않습니다.
        """
        # 권한 확인 및 MST 데이터 가져오기
        allowed_job_ids = self._get_allowed_job_ids_for_schedule(user)
        if allowed_job_ids is not None and not allowed_job_ids:
            return []

        # 스케줄 생성
        scheduled_tasks = self._generate_scheduled_tasks(start_date, end_date, allowed_job_ids)

        # 히스토리 데이터 가져오기 및 그룹화
        history_by_date_job = self._fetch_and_group_history_data(start_date, end_date, allowed_job_ids, user)

        # 스케줄과 히스토리 매칭하여 상태 업데이트
        self._match_schedule_with_history(scheduled_tasks, history_by_date_job)

        # 스케줄 외 실행은 표시하지 않음 (매칭되지 않은 히스토리 추가하지 않음)

        return scheduled_tasks

    def _fetch_and_group_history_data(self, start_date, end_date, allowed_job_ids: Optional[List[str]], user: Optional[Dict]) -> Dict[str, List[Dict]]:
        """히스토리 데이터를 가져와서 날짜/Job ID별로 그룹화합니다."""
        dashboard_mapper = DashboardMapper(self.conn)
        kst = pytz.timezone('Asia/Seoul')

        # 히스토리 데이터 조회
        history_data = dashboard_mapper.get_collection_history_for_schedule(start_date, end_date, allowed_job_ids)

        # 날짜/Job ID별 그룹화
        history_by_date_job = {}
        for hist in history_data:
            try:
                # KST 변환 및 시간 정보 유지
                start_dt_utc = hist['start_dt']
                if start_dt_utc.tzinfo is None:
                    start_dt_utc = pytz.utc.localize(start_dt_utc)
                start_dt_kst = start_dt_utc.astimezone(kst)

                date_key = start_dt_kst.strftime('%Y-%m-%d')
                job_key = hist['job_id']

                key = f"{date_key}_{job_key}"
                if key not in history_by_date_job:
                    history_by_date_job[key] = []

                history_by_date_job[key].append({
                    'start_dt_kst': start_dt_kst,
                    'status': hist['status'],
                    'job_id': job_key
                })
            except Exception as e:
                current_app.logger.warning(f"Error processing history record: {e}")
                continue

        return history_by_date_job

    def _match_schedule_with_history(self, scheduled_tasks: List[Dict], history_by_date_job: Dict[str, List[Dict]]) -> None:
        """스케줄과 히스토리를 날짜별로 순차 매칭하여 상태를 업데이트합니다."""
        # 날짜별로 스케줄 그룹화
        date_schedules = {}
        for task in scheduled_tasks:
            date_str = task['date'][:10]  # YYYY-MM-DD
            if date_str not in date_schedules:
                date_schedules[date_str] = []
            date_schedules[date_str].append(task)

        # 각 날짜별로 매칭
        for date_str, day_schedules in date_schedules.items():
            # 해당 날짜의 히스토리 가져오기
            date_job_key = f"{date_str}_"
            day_histories = []
            for key, histories in history_by_date_job.items():
                if key.startswith(date_job_key):
                    day_histories.extend(histories)

            if not day_histories:
                continue

            # job별로 그룹화
            job_schedules = {}
            job_histories = {}

            for task in day_schedules:
                job = task['job_id']
                if job not in job_schedules:
                    job_schedules[job] = []
                job_schedules[job].append(task)

            for hist in day_histories:
                job = hist['job_id']
                if job not in job_histories:
                    job_histories[job] = []
                job_histories[job].append(hist)

            # 각 job별로 순차 매칭
            for job, schedules in job_schedules.items():
                if job in job_histories:
                    # 스케줄과 히스토리를 시간순으로 정렬
                    schedules.sort(key=lambda x: x['date'])
                    histories = sorted(job_histories[job], key=lambda x: x['start_dt_kst'])

                    # 상태 매핑
                    status_mapping = {
                        'CD901': '성공',
                        'CD902': '실패',
                        'CD903': '데이터 존재안함',
                        'CD904': '진행중',
                        'CD905': '진행중'
                    }

                    # 순차적으로 매칭 (실행 기록 수만큼 스케줄에 성공 처리)
                    for i, hist in enumerate(histories):
                        if i < len(schedules):
                            schedules[i]['status'] = status_mapping.get(hist['status'], '미수집')

    def _get_allowed_job_ids_for_schedule(self, user: Optional[Dict]) -> Optional[List[str]]:
        """사용자 권한에 따라 허용된 Job ID 목록을 반환합니다."""
        if not user:
            return None

        is_admin = 'mngr_sett' in user.get('permissions', [])
        if is_admin:
            return None  # 모든 Job 허용

        allowed_job_ids = user.get('data_permissions', [])
        if not allowed_job_ids:
            return []
        return allowed_job_ids

    def _generate_scheduled_tasks(self, start_date, end_date, allowed_job_ids: Optional[List[str]]) -> List[Dict]:
        """MST 데이터로부터 스케줄된 작업들을 생성합니다."""
        mst_mapper = MstMapper(self.conn)
        kst = pytz.timezone('Asia/Seoul')
        now_kst = datetime.now(kst)

        all_mst_data = mst_mapper.get_all_mst_for_schedule(allowed_job_ids)
        jobs = {mst['cd']: mst.get('item6') for mst in all_mst_data if mst.get('item6')}

        scheduled_tasks = []
        current_date = start_date
        while current_date <= end_date:
            for cd, cron_str in jobs.items():
                if not cron_str or not re.match(r'^(\S+\s+){4,5}\S+$', cron_str.strip()):
                    continue

                try:
                    base_time = datetime(current_date.year, current_date.month, current_date.day)
                    cron = croniter.croniter(cron_str, base_time)
                    schedule_time = cron.get_next(datetime)
                    while schedule_time.date() == current_date:
                        schedule_time_aware = kst.localize(schedule_time)
                        status = "미수집"
                        if schedule_time_aware > now_kst:
                            status = "예정"

                        scheduled_tasks.append({
                            "date": schedule_time.strftime('%Y-%m-%d %H:%M:%S'),
                            "job_id": cd,
                            "cron": cron_str,
                            "status": status,
                        })
                        schedule_time = cron.get_next(datetime)
                except (ValueError, KeyError):
                    current_app.logger.warning(f"Skipping job '{cd}' due to invalid cron string: '{cron_str}'")
                    continue
                except Exception as e:
                    current_app.logger.error(f"Error parsing cron string '{cron_str}' for job '{cd}': {e}")
            current_date += timedelta(days=1)

        return scheduled_tasks
