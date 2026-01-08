# service/card_summary_service.py
from collections import defaultdict
from service.dashboard_service import DashboardService
from service.collection_schedule_service import CollectionScheduleService
from datetime import datetime, date
import pytz
from flask import current_app

class CardSummaryService:
    def __init__(self, db_connection):
        self.db_connection = db_connection
        self.dashboard_service = DashboardService(db_connection)
        self.collection_schedule_service = CollectionScheduleService(db_connection)

    def get_card_summary(self, user):
        """
        Gets the latest job status for today and formats it for the card summary view.
        """
        kst = pytz.timezone('Asia/Seoul')
        today = datetime.now(kst).date()

        # 1. Get today's scheduled tasks
        job_statuses_today = self.collection_schedule_service.get_schedule_only(today, today, user)
        
        # 2. 권한 체크를 위한 허용된 Job IDs 준비
        allowed_job_ids = None
        if user:
            is_admin = 'mngr_sett' in user.get('permissions', [])
            if not is_admin:
                allowed_job_ids = set(user.get('data_permissions', []))
        
        # 3. Build summary data
        summary_data = defaultdict(lambda: {
            "success": {"count": 0, "jobs": []},
            "progress": {"count": 0, "jobs": []},
            "fail": {"count": 0, "jobs": []},
            "uncollected": {"count": 0, "jobs": []},
            "scheduled": {"count": 0, "jobs": []}
        })

        for job in job_statuses_today:
            job_id = job['job_id']
            status = job['status']
            
            # 권한 체크: 사용자에게 권한이 없는 Job은 건너뜀
            if allowed_job_ids is not None and job_id not in allowed_job_ids:
                continue
            
            if job_id and job_id.startswith('CD'):
                group = f"CD{job_id[2]}00"  # e.g., CD101 -> CD100
                
                # Extract hour from schedule time string
                schedule_time_str = job.get('date', '')
                hour = ''
                try:
                    schedule_dt = datetime.strptime(schedule_time_str, '%Y-%m-%d %H:%M:%S')
                    hour = f"({schedule_dt.hour}시)"
                except ValueError:
                    pass # Keep hour empty if format is incorrect
                
                formatted_job = f"{job_id}{hour}"

                if status == '성공':
                    summary_data[group]['success']['count'] += 1
                    summary_data[group]['success']['jobs'].append(formatted_job)
                elif status == '수집중':
                    summary_data[group]['progress']['count'] += 1
                    summary_data[group]['progress']['jobs'].append(formatted_job)
                elif status == '실패':
                    summary_data[group]['fail']['count'] += 1
                    summary_data[group]['fail']['jobs'].append(formatted_job)
                elif status == '미수집':
                    summary_data[group]['uncollected']['count'] += 1
                    summary_data[group]['uncollected']['jobs'].append(formatted_job)
                elif status == '예정':
                    summary_data[group]['scheduled']['count'] += 1
                    summary_data[group]['scheduled']['jobs'].append(formatted_job)

        return summary_data
