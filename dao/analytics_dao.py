import logging
from typing import Dict, List, Tuple, Optional
import psycopg2.extras
from dao.sql_loader import load_sql
from msys.column_mapper import convert_to_legacy_columns
from utils.logging_config import log_operation

class AnalyticsDAO:
    def __init__(self, conn):
        self.conn = conn

    def insert_user_access_log(self, user_id: str, menu_name: str):
        """
        사용자 접속 로그를 데이터베이스에 삽입합니다.
        """
        query = load_sql('analytics/insert_user_access_log.sql')
        try:
            with self.conn.cursor() as cur:
                cur.execute(query, (user_id, menu_name))
            self.conn.commit()
            log_operation("분석", "접속 로그", "데이터 삽입", "성공")
        except Exception as e:
            self.conn.rollback()
            log_operation("분석", "접속 로그", "데이터 삽입", f"실패: {type(e).__name__}", "ERROR")
            raise

    def get_menu_name_by_menu_id(self, menu_id: str) -> Optional[str]:
        """
        MENU_ID를 사용하여 TB_MENU 테이블에서 MENU_NM을 조회합니다.
        """
        query = load_sql('analytics/get_menu_name_by_id.sql')
        try:
            with self.conn.cursor() as cur:
                cur.execute(query, (menu_id,))
                result = cur.fetchone()
                if result:
                    logging.info(f"DAO: Found menu name '{result[0]}' for menu_id '{menu_id}'.")
                    return result[0]
                else:
                    logging.warning(f"DAO: No menu name found for menu_id '{menu_id}'.")
                    return None
        except Exception as e:
            logging.error(f"DAO: Failed to get menu name for menu_id '{menu_id}'. Error: {e}", exc_info=True)
            return None

    def get_user_access_stats(self, year: Optional[str] = None, month: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict]:
        """
        기간별, 메뉴별 접속 통계를 조회합니다.
        """
        # This method generates a dynamic WHERE clause, so we handle it in the DAO.
        base_query = load_sql('analytics/get_user_access_stats.sql')
        
        conditions = []
        params = []
        
        if year and month:
            conditions.append("EXTRACT(YEAR FROM ACS_DT) = %s AND EXTRACT(MONTH FROM ACS_DT) = %s")
            params.extend([year, month])
        elif start_date and end_date:
            conditions.append("ACS_DT::date BETWEEN %s AND %s")
            params.extend([start_date, end_date])
            
        where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
        query = base_query.format(where_clause=where_clause)
        with self.conn.cursor() as cur:
            cur.execute(query, params)
            columns = [desc[0] for desc in cur.description]
            results = [dict(zip(columns, row)) for row in cur.fetchall()]
            log_operation("분석", "접속 통계", "데이터 조회", f"{len(results)}건 반환")
            return convert_to_legacy_columns('TB_USER_ACS_LOG', results)

    def get_menu_access_stats(self, view_type: str = 'daily', start_date: Optional[str] = None, end_date: Optional[str] = None, year: Optional[str] = None, month: Optional[str] = None) -> List[Dict]:
        """
        기간별, 메뉴별 접속 통계(총 접속수, 순 방문자수)를 조회합니다.
        """
        base_query = load_sql('analytics/get_menu_access_stats.sql')
        
        conditions = []
        params = []

        if view_type == 'daily' and start_date and end_date:
            # 날짜 범위 비교 (시작일 00:00:00부터 종료일 23:59:59까지)
            conditions.append("ACS_DT >= %s::timestamp AND ACS_DT < (%s::timestamp + INTERVAL '1 day')")
            params.extend([start_date, end_date])
        elif view_type == 'monthly' and year and month:
            conditions.append("EXTRACT(YEAR FROM ACS_DT) = %s AND EXTRACT(MONTH FROM ACS_DT) = %s")
            params.extend([year, month])
        elif view_type == 'yearly' and year:
            conditions.append("EXTRACT(YEAR FROM ACS_DT) = %s")
            params.append(year)
        else: # 기본값: 오늘 하루
            conditions.append("ACS_DT::date = CURRENT_DATE")

        where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
        query = base_query.format(where_clause=where_clause)
        
        with self.conn.cursor() as cur:
            cur.execute(query, params)
            columns = [desc[0] for desc in cur.description]
            results = [dict(zip(columns, row)) for row in cur.fetchall()]
            log_operation("분석", "메뉴 통계", "데이터 조회", f"{len(results)}건 반환")
            return convert_to_legacy_columns('TB_USER_ACS_LOG', results)

    def get_most_recent_data_date(self) -> Optional[str]:
        """
        가장 최근 접속 데이터가 있는 날짜를 조회합니다.
        """
        query = "SELECT MAX(ACS_DT::date) FROM TB_USER_ACS_LOG"
        try:
            with self.conn.cursor() as cur:
                cur.execute(query)
                result = cur.fetchone()
                if result and result[0]:
                    recent_date = result[0].strftime('%Y-%m-%d')
                    logging.info(f"DAO: Found most recent data date: {recent_date}")
                    return recent_date
                else:
                    logging.warning("DAO: No access log data found")
                    return None
        except Exception as e:
            logging.error(f"DAO: Failed to get most recent data date. Error: {e}", exc_info=True)
            return None

    def get_total_access_stats(self, view_type: str = 'daily', start_date: Optional[str] = None, end_date: Optional[str] = None, year: Optional[str] = None, month: Optional[str] = None) -> Dict:
        """
        기간별 전체 접속 통계를 '메뉴별 통계'와 동일한 방식으로 조회합니다.
        """
        menu_stats = self.get_menu_access_stats(view_type, start_date, end_date, year, month)
        
        total_access_count = sum(item.get('total_access_count', 0) for item in menu_stats)
        
        # 순 방문자 수는 전체 기간에 대해 고유한 사용자를 다시 계산해야 합니다.
        base_query = "SELECT COUNT(DISTINCT user_id) FROM tb_user_acs_log"
        conditions = []
        params = []

        if view_type == 'daily' and start_date and end_date:
            # 날짜 범위 비교 (시작일 00:00:00부터 종료일 23:59:59까지)
            conditions.append("ACS_DT >= %s::timestamp AND ACS_DT < (%s::timestamp + INTERVAL '1 day')")
            params.extend([start_date, end_date])
        elif view_type == 'monthly' and year and month:
            conditions.append("EXTRACT(YEAR FROM ACS_DT) = %s AND EXTRACT(MONTH FROM ACS_DT) = %s")
            params.extend([year, month])
        elif view_type == 'yearly' and year:
            conditions.append("EXTRACT(YEAR FROM ACS_DT) = %s")
            params.append(year)

        if conditions:
            base_query += " WHERE " + " AND ".join(conditions)

        with self.conn.cursor() as cur:
            cur.execute(base_query, params)
            unique_user_count = cur.fetchone()[0]

        return {
            'total_access_count': total_access_count,
            'unique_user_count': unique_user_count
        }

    def get_available_years_months(self) -> List[Dict]:
        """
        데이터가 있는 연도와 월 목록을 조회합니다.
        """
        query = load_sql('analytics/get_available_years_months.sql')
        with self.conn.cursor() as cur:
            cur.execute(query)
            columns = [desc[0] for desc in cur.description]
            results = [dict(zip(columns, row)) for row in cur.fetchall()]
            logging.info(f"DAO: Fetched {len(results)} available year/month records.")
            return convert_to_legacy_columns('TB_USER_ACS_LOG', results)

    def get_menu_access_stats_weekly(self, year: str, menu_nm: Optional[str] = None) -> List[Dict]:
        """
        연간 주별 메뉴 접속 통계를 '일별 데이터 기반'으로 집계하여 조회합니다.
        """
        query = """
            -- 1. 일별, 메뉴별로 총 접속수와 순 방문자수 집계
            SELECT
                ACS_DT::date AS access_date,
                MENU_NM,
                COUNT(*) AS total_access_count,
                COUNT(DISTINCT USER_ID) AS unique_user_count
            FROM
                TB_USER_ACS_LOG
            WHERE
                EXTRACT(YEAR FROM ACS_DT) = %s
        """
        params = [year]
        if menu_nm and menu_nm != 'all':
            query += " AND MENU_NM = %s"
            params.append(menu_nm)
        
        query += " GROUP BY access_date, MENU_NM"

        with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(query, params)
            daily_stats = cur.fetchall()

        # 2. Python에서 주차 계산 및 재집계
        weekly_aggregated_stats = {}
        for row in daily_stats:
            date = row['access_date']
            month = date.month
            
            # 월의 첫 날과 그 날의 요일 찾기
            first_day_of_month = date.replace(day=1)
            first_day_weekday = first_day_of_month.weekday() # Monday is 0 and Sunday is 6
            
            # 주차 계산 (일요일 시작 기준)
            # (day + weekday of 1st of month) / 7, rounded up.
            week_of_month = (date.day + first_day_weekday) // 7 + 1

            week_key = (month, week_of_month, row['menu_nm'])
            
            if week_key not in weekly_aggregated_stats:
                weekly_aggregated_stats[week_key] = {
                    'total_access_count': 0,
                    'unique_user_count': 0 # 일별 순방문자를 주 단위로 합산
                }
            
            weekly_aggregated_stats[week_key]['total_access_count'] += row['total_access_count']
            weekly_aggregated_stats[week_key]['unique_user_count'] += row['unique_user_count']

        # 3. 최종 결과 포맷으로 변환
        results = []
        for (month, week, menu), stats in weekly_aggregated_stats.items():
            results.append({
                'month': month,
                'week_of_month': week,
                'menu_nm': menu,
                'total_access_count': stats['total_access_count'],
                'unique_user_count': stats['unique_user_count']
            })
        
        logging.info(f"DAO: Fetched and processed {len(results)} records for weekly menu access stats for year {year}.")
        return sorted(results, key=lambda x: (x['month'], x['week_of_month'], x['menu_nm']))

    def get_distinct_menu_names(self) -> List[str]:
        """
        TB_USER_ACS_LOG 테이블에서 고유한 메뉴 이름 목록을 조회합니다.
        """
        query = "SELECT DISTINCT MENU_NM FROM TB_USER_ACS_LOG ORDER BY MENU_NM;"
        with self.conn.cursor() as cur:
            cur.execute(query)
            results = [row[0] for row in cur.fetchall()]
            logging.info(f"DAO: Fetched {len(results)} distinct menu names.")
            return results

    def get_total_unique_users_by_week(self, year: str) -> Dict[Tuple[int, int], int]:
        """
        연간 주별 전체 순 방문자 수를 '일별 합산' 방식으로 조회합니다.
        """
        query = """
            WITH DailySiteUniqueCounts AS (
                -- 1. 일별 사이트 전체 고유 사용자 수 계산
                SELECT
                    ACS_DT::date AS access_date,
                    COUNT(DISTINCT USER_ID) AS daily_site_unique_count
                FROM
                    TB_USER_ACS_LOG
                WHERE
                    EXTRACT(YEAR FROM ACS_DT) = %s
                GROUP BY
                    access_date
            )
            -- 2. 주별로 일별 고유 사용자 수의 합계 계산
            SELECT
                EXTRACT(MONTH FROM access_date)::integer AS month,
                FLOOR((EXTRACT(DAY FROM access_date) + EXTRACT(DOW FROM DATE_TRUNC('month', access_date)) - 2) / 7) + 1 AS week_of_month,
                SUM(daily_site_unique_count) AS site_unique_user_count
            FROM
                DailySiteUniqueCounts
            GROUP BY
                month, week_of_month;
        """
        with self.conn.cursor() as cur:
            cur.execute(query, (year,))
            results = {}
            for row in cur.fetchall():
                # 결과를 (month, week): count 형태의 딕셔너리로 변환
                results[(row[0], row[1])] = int(row[2])
            logging.info(f"DAO: Fetched weekly total unique users (sum of daily uniques) for year {year}.")
            return results

    def get_yearly_total_stats(self, year: str, menu_nm: Optional[str] = None) -> Dict:
        """
        연간 전체 접속 통계를 '일별 데이터 기반'으로 집계하여 조회합니다.
        """
        final_result = {'total_access_count': 0, 'total_menu_unique_user_count': 0, 'total_site_unique_user_count': 0}
        
        with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # 1. Get total_access_count
            query1 = "SELECT COUNT(*) AS total_access_count FROM TB_USER_ACS_LOG WHERE EXTRACT(YEAR FROM ACS_DT) = %s"
            params1 = [year]
            if menu_nm and menu_nm != 'all':
                query1 += " AND MENU_NM = %s"
                params1.append(menu_nm)
            cur.execute(query1, params1)
            res1 = cur.fetchone()
            if res1 and res1['total_access_count'] is not None:
                final_result['total_access_count'] = int(res1['total_access_count'])

            # 2. Get total_menu_unique_user_count (sum of daily unique users per menu)
            query2_base = """
                SELECT SUM(t.daily_unique_users) as total_menu_unique_user_count
                FROM (
                    SELECT COUNT(DISTINCT USER_ID) as daily_unique_users
                    FROM TB_USER_ACS_LOG
                    WHERE EXTRACT(YEAR FROM ACS_DT) = %s
                    {menu_filter}
                    GROUP BY ACS_DT::date, MENU_NM
                ) t
            """
            params2 = [year]
            menu_filter_sql = ""
            if menu_nm and menu_nm != 'all':
                menu_filter_sql = "AND MENU_NM = %s"
                params2.append(menu_nm)
            query2 = query2_base.format(menu_filter=menu_filter_sql)
            cur.execute(query2, params2)
            res2 = cur.fetchone()
            if res2 and res2['total_menu_unique_user_count'] is not None:
                final_result['total_menu_unique_user_count'] = int(res2['total_menu_unique_user_count'])

            # 3. Get total_site_unique_user_count (sum of daily unique users for the whole site)
            query3 = """
                SELECT SUM(t.daily_site_unique_count) as total_site_unique_user_count
                FROM (
                    SELECT COUNT(DISTINCT USER_ID) as daily_site_unique_count
                    FROM TB_USER_ACS_LOG
                    WHERE EXTRACT(YEAR FROM ACS_DT) = %s
                    GROUP BY ACS_DT::date
                ) t
            """
            cur.execute(query3, [year])
            res3 = cur.fetchone()
            if res3 and res3['total_site_unique_user_count'] is not None:
                final_result['total_site_unique_user_count'] = int(res3['total_site_unique_user_count'])

        logging.info(f"DAO: Fetched yearly total stats for year {year}.")
        return final_result

    def get_menu_access_stats_monthly(self, start_date: str, end_date: str) -> List[Dict]:
        """
        월별 메뉴 접속 통계를 조회합니다.
        """
        query = load_sql('analytics/get_menu_access_stats_monthly.sql')
        with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(query, {'start_date': start_date, 'end_date': end_date})
            results = cur.fetchall()
            logging.info(f"DAO: Fetched {len(results)} records for monthly menu access stats.")
            return [dict(row) for row in results]
