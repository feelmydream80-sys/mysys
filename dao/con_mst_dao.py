# === File: dao/con_mst_dao.py ===
import logging
from typing import Optional
from dao.sql_loader import load_sql
from msys.column_mapper import convert_to_legacy_columns

class ConMstDAO:
    def __init__(self, conn):
        self.conn = conn

    def get_all_mst(self) -> list[dict]:
        """
        tb_con_mst에서 모든 마스터 데이터를 가져옵니다. (기존 함수)
        컬럼명을 모두 소문자로 변환하여 dict로 반환합니다.
        """
        try:
            with self.conn.cursor() as cur:
                query = load_sql('mst/get_all_mst.sql')
                logging.info("tb_con_mst SQL 쿼리 실행: %s", query)
                cur.execute(query)
                columns = [desc[0].lower() for desc in cur.description]
                logging.info("tb_con_mst SQL 컬럼명: %s", columns)
                results = cur.fetchall()
                logging.info("tb_con_mst SQL 결과 개수: %d", len(results))
                
                # 처음 3개 결과 로그
                for i, row in enumerate(results[:3]):
                    logging.info("tb_con_mst SQL 결과 %d: %s", i+1, dict(zip(columns, row)))
                
                data = [dict(zip(columns, row)) for row in results]
                return convert_to_legacy_columns('TB_CON_MST', data)
        except Exception as e:
            logging.error("모든 MST 데이터 로드 실패: %s", e, exc_info=True)
            return []

    def get_all_mst_full(self) -> list[dict]:
        """
        tb_con_mst에서 모든 마스터 데이터를 가져옵니다. (전체 데이터)
        컬럼명을 모두 소문자로 변환하여 dict로 반환합니다.
        """
        try:
            with self.conn.cursor() as cur:
                query = load_sql('mst/get_all_mst_full.sql')
                logging.info("tb_con_mst SQL 쿼리 실행: %s", query)
                cur.execute(query)
                columns = [desc[0].lower() for desc in cur.description]
                logging.info("tb_con_mst SQL 컬럼명: %s", columns)
                results = cur.fetchall()
                logging.info("tb_con_mst SQL 결과 개수: %d", len(results))
                
                # 처음 5개 결과 로그
                for i, row in enumerate(results[:5]):
                    logging.info("tb_con_mst SQL 결과 %d: %s", i+1, dict(zip(columns, row)))
                
                data = [dict(zip(columns, row)) for row in results]
                return convert_to_legacy_columns('TB_CON_MST', data)
        except Exception as e:
            logging.error("모든 MST 데이터 로드 실패: %s", e, exc_info=True)
            return []

    # ✅ 추가: 특정 cd에 해당하는 cd_nm과 item2를 조회하는 메서드
    def get_mst_data_by_cd(self, cd: str) -> Optional[dict]:
        """
        tb_con_mst에서 특정 cd에 해당하는 cd_nm과 item2를 조회합니다.
        """
        try:
            with self.conn.cursor() as cur:
                query = load_sql('mst/get_mst_by_cd.sql')
                cur.execute(query, (cd,))
                result = cur.fetchone()
                if result:
                    columns = [desc[0].lower() for desc in cur.description]
                    data = dict(zip(columns, result))
                    converted = convert_to_legacy_columns('TB_CON_MST', data)
                    logging.debug("tb_con_mst 데이터 조회 성공 (cd: %s): %s", cd, converted)
                    return converted
                logging.debug("tb_con_mst에서 CD %s를 찾을 수 없습니다.", cd)
                return None
        except Exception as e:
            logging.error("tb_con_mst 데이터 로드 실패 (cd: %s): %s", cd, e, exc_info=True)
            return None

    def get_error_code_map(self) -> list[dict]:
        """
        장애코드 매핑용: tb_con_mst에서 cd_cl='CD900'인 데이터만 반환
        """
        try:
            with self.conn.cursor() as cur:
                cur.execute(load_sql('mst/get_error_code_map.sql'))
                columns = [desc[0].lower() for desc in cur.description]
                data = [dict(zip(columns, row)) for row in cur.fetchall()]
                return convert_to_legacy_columns('TB_CON_MST', data)
        except Exception as e:
            logging.error("장애코드 매핑 데이터 로드 실패: %s", e, exc_info=True)
            return []

    def get_job_mst_info(self, job_ids):
        """
        job_id 리스트에 해당하는 마스터 상세정보를 dict로 반환
        {job_id: {cd_nm, cd_desc, item1, ...}}
        """
        if not job_ids:
            return {}
        # SQL IN 쿼리 동적 생성
        format_strings = ','.join(['%s'] * len(job_ids))
        query = f"""
            SELECT cd, cd_nm, cd_desc, item1, item2, item3, item4, item5, item6, item7, item8, item9, item10
            FROM tb_con_mst
            WHERE cd IN ({format_strings})
        """
        with self.conn.cursor() as cur:
            cur.execute(query, tuple(job_ids))
            columns = [desc[0].lower() for desc in cur.description]
            result = {}
            for row in cur.fetchall():
                row_dict = dict(zip(columns, row))
                job_id = row_dict['cd']
                result[job_id] = convert_to_legacy_columns('TB_CON_MST', row_dict)
            return result

    def insert_mst_data(self, data):
        """
        tb_con_mst에 새로운 데이터를 삽입합니다.
        """
        try:
            with self.conn.cursor() as cur:
                query = load_sql('mst/insert_mst.sql')
                cur.execute(query, (
                    data.get('cd_cl'),
                    data.get('cd'),
                    data.get('cd_nm'),
                    data.get('cd_desc'),
                    data.get('item1'),
                    data.get('item2'),
                    data.get('item3'),
                    data.get('item4'),
                    data.get('item5'),
                    data.get('item6'),
                    data.get('item7'),
                    data.get('item8'),
                    data.get('item9'),
                    data.get('item10')
                ))
                logging.info("tb_con_mst 데이터 삽입 성공 (cd: %s)", data.get('cd'))
        except Exception as e:
            logging.error("tb_con_mst 데이터 삽입 실패: %s", e, exc_info=True)
            raise

    def update_mst_data(self, cd_cl, cd, data):
        """
        tb_con_mst의 데이터를 수정합니다.
        기존 데이터를 가져와서 누락된 필드를 채워 null로 업데이트하는 문제를 방지합니다.
        """
        try:
            # 기존 데이터 가져오기
            existing_data = self.get_mst_data_by_cd(cd)
            
            # 기존 데이터가 없으면 오류 발생
            if not existing_data:
                raise ValueError(f"Data with CD {cd} does not exist.")
            
            # 전달된 데이터로 기존 데이터 업데이트 (누락된 필드는 기존 값 유지)
            update_data = {
                'cd_nm': data.get('cd_nm', existing_data.get('cd_nm')),
                'cd_desc': data.get('cd_desc', existing_data.get('cd_desc')),
                'item1': data.get('item1', existing_data.get('item1')),
                'item2': data.get('item2', existing_data.get('item2')),
                'item3': data.get('item3', existing_data.get('item3')),
                'item4': data.get('item4', existing_data.get('item4')),
                'item5': data.get('item5', existing_data.get('item5')),
                'item6': data.get('item6', existing_data.get('item6')),
                'item7': data.get('item7', existing_data.get('item7')),
                'item8': data.get('item8', existing_data.get('item8')),
                'item9': data.get('item9', existing_data.get('item9')),
                'item10': data.get('item10', existing_data.get('item10')),
                'use_yn': data.get('use_yn', existing_data.get('use_yn', 'Y')).strip()
            }
            
            with self.conn.cursor() as cur:
                query = load_sql('mst/update_mst.sql')
                cur.execute(query, (
                    update_data['cd_nm'],
                    update_data['cd_desc'],
                    update_data['item1'],
                    update_data['item2'],
                    update_data['item3'],
                    update_data['item4'],
                    update_data['item5'],
                    update_data['item6'],
                    update_data['item7'],
                    update_data['item8'],
                    update_data['item9'],
                    update_data['item10'],
                    update_data['use_yn'],
                    cd_cl,
                    cd
                ))
                logging.info("tb_con_mst 데이터 수정 성공 (cd: %s)", cd)
        except Exception as e:
            logging.error("tb_con_mst 데이터 수정 실패: %s", e, exc_info=True)
            raise

    def delete_mst_data(self, cd_cl, cd):
        """
        tb_con_mst의 데이터를 삭제합니다. (소프트 삭제)
        """
        try:
            with self.conn.cursor() as cur:
                query = load_sql('mst/delete_mst.sql')
                cur.execute(query, (cd_cl, cd))
                logging.info("tb_con_mst 데이터 삭제 성공 (cd: %s)", cd)
        except Exception as e:
            logging.error("tb_con_mst 데이터 삭제 실패: %s", e, exc_info=True)
            raise

    def get_paged_jobs(self, start, length, search_value, start_date=None, end_date=None, all_data=True):
        """
        Get paged, sorted and filtered jobs for DataTables, with optional date filtering.
        This version combines jobs from both tb_con_mst and tb_con_hist using a LEFT JOIN
        to ensure all jobs have their details fetched if available.
        """
        with self.conn.cursor() as cur:
            params = []

            # Base subquery for getting all unique job IDs that exist in tb_con_hist
            all_jobs_subquery = """
                SELECT DISTINCT job_id FROM tb_con_hist
            """

            # Total records
            total_query = f"SELECT COUNT(DISTINCT job_id) FROM ({all_jobs_subquery}) as all_jobs"
            cur.execute(total_query)
            total_records = cur.fetchone()[0]

            # Filtering logic
            where_conditions = []
            if search_value:
                where_conditions.append("(all_ids.job_id ILIKE %s OR mst.cd_nm ILIKE %s)")
                params.extend([f"%{search_value}%", f"%{search_value}%"])
            
            where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""

            # Common query body
            query_body = f"""
                FROM (
                    {all_jobs_subquery}
                ) as all_ids
                LEFT JOIN tb_con_mst as mst ON all_ids.job_id = mst.cd
                {where_clause}
            """

            # Filtered records count
            count_query = f"SELECT COUNT(DISTINCT all_ids.job_id) {query_body}"
            cur.execute(count_query, tuple(params))
            filtered_records = cur.fetchone()[0]

            # Data for the current page
            data_query = f"""
                SELECT
                    all_ids.job_id,
                    mst.cd_nm,
                    mst.item6 as cron,
                    mst.cd_desc as description
                {query_body}
                ORDER BY all_ids.job_id
            """

            if length != -1:
                data_query += " LIMIT %s OFFSET %s"
                params.extend([length, start])

            cur.execute(data_query, tuple(params))
            
            columns = [desc[0].lower() for desc in cur.description]
            jobs = [dict(zip(columns, row)) for row in cur.fetchall()]
            
            converted_jobs = convert_to_legacy_columns('TB_CON_MST', jobs)
            return converted_jobs, total_records, filtered_records