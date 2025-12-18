# mapper/dashboard_mapper.py
import logging
from dao.sql_loader import load_sql
from sql.dashboard.dashboard_sql import DashboardSQL
from sql.analytics.analytics_sql import AnalyticsSQL
from sql.raw_data.raw_data_sql import RawDataSQL
from typing import Optional, List, Dict
from msys.column_mapper import convert_to_new_columns
from utils.logging_config import log_operation
import json
from datetime import datetime, timedelta
import pytz

class DashboardMapper:
    def __init__(self, conn):
        self.conn = conn

    def get_summary(self, start_date: Optional[str] = None, end_date: Optional[str] = None, all_data: bool = False, job_ids: Optional[List[str]] = None) -> List[Dict]:
        try:
            query, params = DashboardSQL.get_dashboard_summary(start_date, end_date, all_data, job_ids)
            with self.conn.cursor() as cur:
                cur.execute(query, params)
                columns = [desc[0] for desc in cur.description]
                results = [dict(zip(columns, row)) for row in cur.fetchall()]
                converted_results = convert_to_new_columns('TB_CON_HIST', results)
                log_operation("대시보드", "요약 데이터", "조회", f"{len(converted_results)}건 반환")
                return converted_results
        except Exception as e:
            log_operation("대시보드", "요약 데이터", "조회", f"실패: {type(e).__name__}", "ERROR")
            raise

    def get_min_max_dates(self) -> Optional[Dict]:
        query = load_sql('dashboard/get_min_max_dates.sql')
        with self.conn.cursor() as cur:
            cur.execute(query)
            result = cur.fetchone()
            if result:
                min_date_str = str(result[0]) if result[0] else None
                max_date_str = str(result[1]) if result[1] else None
                return {"min_date": min_date_str, "max_date": max_date_str}
            return None

    def get_raw_data(self, start_date: Optional[str] = None, end_date: Optional[str] = None, job_ids: Optional[List[str]] = None, all_data: bool = False, use_kst_today: bool = False) -> List[Dict]:
        query, params = RawDataSQL.get_raw_data(start_date, end_date, job_ids, all_data, use_kst_today)
        with self.conn.cursor() as cur:
            cur.execute(query, tuple(params))
            columns = [desc[0] for desc in cur.description]
            results = [dict(zip(columns, row)) for row in cur.fetchall()]
            return convert_to_new_columns('TB_CON_HIST', results)

    def get_analytics_success_rate_trend(self, start_date: Optional[str] = None, end_date: Optional[str] = None, job_ids: Optional[List[str]] = None) -> List[Dict]:
        base_query = load_sql('analytics/get_cumulative_success_rate_trend.sql')
        conditions = ["status IN ('CD901', 'CD902', 'CD903')"]
        params = []

        kst = pytz.timezone('Asia/Seoul')
        utc = pytz.utc

        if start_date:
            start_dt_kst = kst.localize(datetime.strptime(start_date, '%Y-%m-%d'))
            start_dt_utc = start_dt_kst.astimezone(utc)
            conditions.append("start_dt >= %s")
            params.append(start_dt_utc)

        if end_date:
            end_dt_kst = kst.localize(datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1, microseconds=-1))
            end_dt_utc = end_dt_kst.astimezone(utc)
            conditions.append("start_dt <= %s")
            params.append(end_dt_utc)

        if job_ids:
            conditions.append("job_id = ANY(%s)")
            params.append(job_ids)

        where_clause = "WHERE " + " AND ".join(conditions)
        query = base_query.format(where_clause=where_clause)
        with self.conn.cursor() as cur:
            cur.execute(query, params)
            columns = [desc[0] for desc in cur.description]
            results = [dict(zip(columns, row)) for row in cur.fetchall()]
            return convert_to_new_columns('TB_CON_HIST', results)

    def get_analytics_trouble_by_code(self, start_date: Optional[str] = None, end_date: Optional[str] = None, job_ids: Optional[List[str]] = None) -> List[Dict]:
        base_query = load_sql('analytics/get_trouble_by_code.sql')
        conditions = ["status != 'CD901'"]
        params = []

        kst = pytz.timezone('Asia/Seoul')
        utc = pytz.utc

        if start_date:
            start_dt_kst = kst.localize(datetime.strptime(start_date, '%Y-%m-%d'))
            start_dt_utc = start_dt_kst.astimezone(utc)
            conditions.append("start_dt >= %s")
            params.append(start_dt_utc)

        if end_date:
            end_dt_kst = kst.localize(datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1, microseconds=-1))
            end_dt_utc = end_dt_kst.astimezone(utc)
            conditions.append("start_dt <= %s")
            params.append(end_dt_utc)

        if job_ids:
            conditions.append("job_id = ANY(%s)")
            params.append(job_ids)
        where_clause = "WHERE " + " AND ".join(conditions)
        query = base_query.format(where_clause=where_clause)
        with self.conn.cursor() as cur:
            cur.execute(query, params)
            columns = [desc[0] for desc in cur.description]
            results = [dict(zip(columns, row)) for row in cur.fetchall()]
            return convert_to_new_columns('TB_CON_HIST', results)

    def get_distinct_job_ids(self, job_ids: Optional[List[str]] = None) -> List[str]:
        query, params = DashboardSQL.get_distinct_job_ids(job_ids)
        with self.conn.cursor() as cur:
            cur.execute(query, tuple(params))
            return [row[0] for row in cur.fetchall() if row[0]]

    def get_event_log(self, start_date: Optional[str] = None, end_date: Optional[str] = None, all_data: bool = False, job_ids: Optional[List[str]] = None) -> List[Dict]:
        base_query = load_sql('dashboard/get_event_log.sql')
        params = []
        where_clauses = []

        if not all_data:
            kst = pytz.timezone('Asia/Seoul')
            utc = pytz.utc

            if start_date:
                start_dt_kst = kst.localize(datetime.strptime(start_date, '%Y-%m-%d'))
                start_dt_utc = start_dt_kst.astimezone(utc)
                where_clauses.append("EVNT_OCCR_TIME >= %s")
                params.append(start_dt_utc)

            if end_date:
                end_dt_kst = kst.localize(datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1, microseconds=-1))
                end_dt_utc = end_dt_kst.astimezone(utc)
                where_clauses.append("EVNT_OCCR_TIME <= %s")
                params.append(end_dt_utc)

        # 데이터 접근 권한 적용 - Job ID 필터링
        if job_ids is not None:
            if not job_ids:  # 빈 리스트인 경우
                return []  # 빈 결과 반환
            # job_id가 NULL인 경우도 고려하여 조건 추가
            job_id_conditions = ["(EVNT_CHG_ROW ->> 'job_id')::text = %s" for _ in job_ids]
            job_id_conditions.append("(EVNT_CHG_ROW ->> 'job_id')::text IS NULL")  # NULL 값도 포함
            where_clauses.append("(" + " OR ".join(job_id_conditions) + ")")
            params.extend(job_ids)

        where_clause = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
        query = base_query.format(where_clause=where_clause)
        with self.conn.cursor() as cur:
            cur.execute(query, tuple(params))
            columns = [desc[0] for desc in cur.description]
            results = [dict(zip(columns, row)) for row in cur.fetchall()]
            return convert_to_new_columns('TB_CON_HIST_EVNT_LOG', results)

    def save_event(self, con_id: Optional[str], job_id: Optional[str], status: str, rqs_info: str):
        query = load_sql('dashboard/insert_event_log.sql')
        now_utc = datetime.utcnow()
        
        event_data = {
            "con_id": con_id,
            "start_dt": now_utc.isoformat(),
            "end_dt": now_utc.isoformat(),
            "job_id": job_id,
            "rqs_info": rqs_info,
            "status": status
        }
        
        event_data_json = json.dumps(event_data)
        
        try:
            with self.conn.cursor() as cur:
                cur.execute(query, (event_data_json,))
        except Exception as e:
            logging.error(f"Mapper: Failed to save event log. Error: {e}")
            raise

    def get_daily_job_counts(self, job_id: Optional[str], start_date: Optional[str], end_date: Optional[str], all_data: bool, job_ids: Optional[List[str]] = None) -> List[Dict]:
        query, params = DashboardSQL.get_daily_job_counts(job_id, start_date, end_date, all_data, job_ids)
        with self.conn.cursor() as cur:
            cur.execute(query, tuple(params))
            columns = [desc[0] for desc in cur.description]
            results = [dict(zip(columns, row)) for row in cur.fetchall()]
            return results

    def get_distinct_error_codes(self, start_date: Optional[str] = None, end_date: Optional[str] = None, all_data: bool = False, job_ids: Optional[List[str]] = None) -> List[str]:
        query, params = DashboardSQL.get_distinct_error_codes(start_date, end_date, all_data, job_ids)
        with self.conn.cursor() as cur:
            cur.execute(query, tuple(params))
            return [row[0] for row in cur.fetchall() if row[0]]

    def get_collection_history_for_schedule(self, start_date: str, end_date: str, job_ids: Optional[List[str]] = None) -> List[Dict]:
        query, params = DashboardSQL.get_collection_history_for_schedule(start_date, end_date, job_ids)
        with self.conn.cursor() as cur:
            cur.execute(query, tuple(params))
            columns = [desc[0] for desc in cur.description]
            results = [dict(zip(columns, row)) for row in cur.fetchall()]
            return convert_to_new_columns('TB_CON_HIST', results)

    def get_collection_history_for_schedule_with_start_dt(self, start_date: str, end_date: str, job_ids: Optional[List[str]] = None) -> List[Dict]:
        query, params = DashboardSQL.get_collection_history_for_schedule_with_start_dt(start_date, end_date, job_ids)
        with self.conn.cursor() as cur:
            cur.execute(query, tuple(params))
            columns = [desc[0] for desc in cur.description]
            results = [dict(zip(columns, row)) for row in cur.fetchall()]
            return convert_to_new_columns('TB_CON_HIST', results)
