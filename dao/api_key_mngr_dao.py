"""TB_API_KEY_MNGR 테이블에 대한 DAO (Data Access Object)"""

from msys.database import get_db_connection
from psycopg2.extras import RealDictCursor
from typing import List, Dict, Any
import logging

class ApiKeyMngrDao:
    """TB_API_KEY_MNGR 테이블의 CRUD operations"""

    def __init__(self):
        """Initialize ApiKeyMngrDao"""
        self.logger = logging.getLogger(__name__)

    def select_all(self) -> List[Dict[str, Any]]:
        """Select all records from TB_API_KEY_MNGR with joined TB_CON_MST data"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            query = """
                SELECT 
                    a.cd,
                    b.ITEM10 as api_key,
                    b.cd_nm,
                    a.api_ownr_email_addr,
                    a.due,
                    a.start_dt
                FROM TB_API_KEY_MNGR a
                LEFT JOIN TB_CON_MST b ON a.cd = b.CD
            """
            
            cursor.execute(query)
            rows = cursor.fetchall()
            
            # Convert to list of dictionaries
            data = []
            for row in rows:
                data.append({
                    'cd': row[0],
                    'api_key': row[1],
                    'cd_nm': row[2],
                    'api_ownr_email_addr': row[3],
                    'due': row[4],
                    'start_dt': row[5]
                })
            
            self.logger.debug(f"Fetched {len(data)} records from TB_API_KEY_MNGR with joined TB_CON_MST data")
            return data
            
        except Exception as e:
            self.logger.error(f"Error selecting all API key manager data: {e}")
            raise
        finally:
            if 'conn' in locals():
                conn.close()

    def select_by_cd(self, cd: str) -> Dict[str, Any]:
        """Select a record from TB_API_KEY_MNGR by CD"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            query = """
                SELECT 
                    a.cd,
                    b.ITEM10 as api_key,
                    b.cd_nm,
                    a.api_ownr_email_addr,
                    a.due,
                    a.start_dt
                FROM TB_API_KEY_MNGR a
                LEFT JOIN TB_CON_MST b ON a.cd = b.CD
                WHERE a.cd = %s
            """
            
            cursor.execute(query, (cd,))
            row = cursor.fetchone()
            
            if row:
                return {
                    'cd': row[0],
                    'api_key': row[1],
                    'cd_nm': row[2],
                    'api_ownr_email_addr': row[3],
                    'due': row[4],
                    'start_dt': row[5]
                }
            return None
            
        except Exception as e:
            self.logger.error(f"Error selecting API key manager data by CD {cd}: {e}")
            raise
        finally:
            if 'conn' in locals():
                conn.close()

    def insert(self, cd: str, due: int, start_dt: str, api_ownr_email_addr: str = None, conn=None) -> bool:
        """Insert a new record into TB_API_KEY_MNGR"""
        try:
            if conn is None:
                conn = get_db_connection()
            cursor = conn.cursor()
            
            query = """
                INSERT INTO TB_API_KEY_MNGR (CD, DUE, START_DT, API_OWNR_EMAIL_ADDR)
                VALUES (%s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    DUE = VALUES(DUE),
                    START_DT = VALUES(START_DT),
                    API_OWNR_EMAIL_ADDR = VALUES(API_OWNR_EMAIL_ADDR)
            """
            
            cursor.execute(query, (cd, due, start_dt, api_ownr_email_addr))
            conn.commit()
            
            self.logger.debug(f"Successfully inserted/updated API key manager record for CD: {cd}")
            return True
            
        except Exception as e:
            if conn is not None:
                conn.rollback()
            self.logger.error(f"Error inserting API key manager record: {e}")
            raise
        finally:
            if conn is None and 'conn' in locals():
                conn.close()

    def update(self, cd: str, due: int, start_dt: str, api_ownr_email_addr: str = None, conn=None) -> bool:
        """Update an existing record in TB_API_KEY_MNGR"""
        try:
            if conn is None:
                conn = get_db_connection()
            cursor = conn.cursor()
            
            query = """
                UPDATE TB_API_KEY_MNGR
                SET DUE = %s,
                    START_DT = %s,
                    API_OWNR_EMAIL_ADDR = %s
                WHERE CD = %s
            """
            
            cursor.execute(query, (due, start_dt, api_ownr_email_addr, cd))
            conn.commit()
            
            self.logger.debug(f"Successfully updated API key manager record for CD: {cd}")
            return True
            
        except Exception as e:
            if conn is not None:
                conn.rollback()
            self.logger.error(f"Error updating API key manager record: {e}")
            raise
        finally:
            if conn is None and 'conn' in locals():
                conn.close()

    def delete(self, cd: str) -> bool:
        """Delete a record from TB_API_KEY_MNGR"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            query = "DELETE FROM TB_API_KEY_MNGR WHERE CD = %s"
            cursor.execute(query, (cd,))
            conn.commit()
            
            self.logger.debug(f"Successfully deleted API key manager record for CD: {cd}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error deleting API key manager record: {e}")
            raise
        finally:
            if 'conn' in locals():
                conn.close()

    def select_mail_settings(self) -> Dict[str, Any]:
        """Select all active mail settings from TB_API_KEY_MNGR_MAIL_SETT"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            query = """
                SELECT mail_tp, subject, from_email, body 
                FROM TB_API_KEY_MNGR_MAIL_SETT 
                WHERE is_active = TRUE
            """
            cursor.execute(query)
            rows = cursor.fetchall()
            
            settings = {}
            for row in rows:
                settings[row['mail_tp']] = {
                    'subject': row['subject'],
                    'from': row['from_email'],
                    'body': row['body']
                }
            
            self.logger.debug(f"Fetched {len(settings)} mail settings")
            return settings
            
        except Exception as e:
            self.logger.error(f"Error selecting mail settings: {e}")
            raise
        finally:
            if 'conn' in locals():
                conn.close()

    def upsert_mail_settings(self, mail_tp: str, subject: str, from_email: str, body: str) -> bool:
        """Insert new mail setting and deactivate old ones in TB_API_KEY_MNGR_MAIL_SETT"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # 기존 활성 설정 비활성화
            cursor.execute(
                "UPDATE TB_API_KEY_MNGR_MAIL_SETT SET is_active = FALSE WHERE mail_tp = %s",
                (mail_tp,)
            )
            
            # 새 설정 삽입
            cursor.execute(
                """INSERT INTO TB_API_KEY_MNGR_MAIL_SETT (mail_tp, subject, from_email, body, is_active)
                   VALUES (%s, %s, %s, %s, TRUE)""",
                (mail_tp, subject, from_email, body)
            )
            
            conn.commit()
            
            self.logger.debug(f"Successfully inserted new mail setting for: {mail_tp}")
            return True
            
        except Exception as e:
            if 'conn' in locals():
                conn.rollback()
            self.logger.error(f"Error upserting mail settings: {e}")
            raise
        finally:
            if 'conn' in locals():
                conn.close()

    def select_event_logs(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Select event logs from tb_con_hist_evnt_log"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            query = """
                SELECT 
                    evnt_id,
                    evnt_tp,
                    evnt_occr_time,
                    evnt_chg_row
                FROM tb_con_hist_evnt_log
                WHERE evnt_tp = 'mail_send'
                ORDER BY evnt_occr_time DESC
                LIMIT %s
            """
            
            cursor.execute(query, (limit,))
            rows = cursor.fetchall()
            
            logs = []
            for row in rows:
                log_data = {
                    'evnt_id': row['evnt_id'],
                    'evnt_tp': row['evnt_tp'],
                    'sent_at': row['evnt_occr_time'].strftime('%Y-%m-%d %H:%M:%S') if row['evnt_occr_time'] else '-',
                }
                
                # Parse JSONB data
                if row['evnt_chg_row']:
                    import json
                    try:
                        chg_data = row['evnt_chg_row']
                        if isinstance(chg_data, str):
                            chg_data = json.loads(chg_data)
                        log_data['cd'] = chg_data.get('cd', '-')
                        log_data['to_email'] = chg_data.get('to_email', '-')
                        log_data['success'] = chg_data.get('success', False)
                        log_data['error_msg'] = chg_data.get('error_msg', '-')
                    except:
                        log_data['cd'] = '-'
                        log_data['to_email'] = '-'
                        log_data['success'] = False
                        log_data['error_msg'] = '-'
                else:
                    log_data['cd'] = '-'
                    log_data['to_email'] = '-'
                    log_data['success'] = False
                    log_data['error_msg'] = '-'
                
                logs.append(log_data)
            
            self.logger.debug(f"Fetched {len(logs)} event logs")
            return logs
            
        except Exception as e:
            self.logger.error(f"Error selecting event logs: {e}")
            raise
        finally:
            if 'conn' in locals():
                conn.close()

    def insert_event_log(self, cd: str, to_email: str, success: bool, error_msg: str = None) -> bool:
        """Insert event log into tb_con_hist_evnt_log"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            import json
            chg_data = json.dumps({
                'cd': cd,
                'to_email': to_email,
                'success': success,
                'error_msg': error_msg
            })
            
            query = """
                INSERT INTO tb_con_hist_evnt_log (evnt_tp, evnt_chg_row)
                VALUES ('mail_send', %s::jsonb)
            """
            
            cursor.execute(query, (chg_data,))
            conn.commit()
            
            self.logger.debug(f"Successfully inserted event log for CD: {cd}")
            return True
            
        except Exception as e:
            if 'conn' in locals():
                conn.rollback()
            self.logger.error(f"Error inserting event log: {e}")
            raise
        finally:
            if 'conn' in locals():
                conn.close()

    # ==========================================
    # 메일 전송 이력 관련 메서드 (신규 추가)
    # ==========================================

    def get_mail_send_log(self, cd: str, mail_tp: str, sent_dt) -> Dict[str, Any]:
        """특정 CD의 특정 날짜 메일 발송 이력 조회"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            query = """
                SELECT log_id, cd, mail_tp, sent_dt, success, error_msg, reg_dt
                FROM TB_API_KEY_MNGR_MAIL_LOG
                WHERE cd = %s AND mail_tp = %s AND sent_dt = %s
                ORDER BY reg_dt DESC
                LIMIT 1
            """
            
            cursor.execute(query, (cd, mail_tp, sent_dt))
            row = cursor.fetchone()
            
            return row if row else None
            
        except Exception as e:
            self.logger.error(f"Error getting mail send log for CD {cd}: {e}")
            raise
        finally:
            if 'conn' in locals():
                conn.close()

    def insert_mail_send_log(self, cd: str, mail_tp: str, sent_dt, success: bool, error_msg: str = None) -> bool:
        """메일 발송 이력 기록"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            query = """
                INSERT INTO TB_API_KEY_MNGR_MAIL_LOG (cd, mail_tp, sent_dt, success, error_msg)
                VALUES (%s, %s, %s, %s, %s)
            """
            
            cursor.execute(query, (cd, mail_tp, sent_dt, success, error_msg))
            conn.commit()
            
            self.logger.debug(f"Successfully inserted mail send log for CD: {cd}, mail_tp: {mail_tp}")
            return True
            
        except Exception as e:
            if 'conn' in locals():
                conn.rollback()
            self.logger.error(f"Error inserting mail send log: {e}")
            raise
        finally:
            if 'conn' in locals():
                conn.close()

    def select_mail_send_logs(self, page_size: int = 50, offset: int = 0, 
                               cd: str = None, mail_tp: str = None, success: bool = None) -> List[Dict[str, Any]]:
        """메일 전송 이력 조회 (페이지네이션 + 필터)"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            query = """
                SELECT log_id, cd, mail_tp, sent_dt, success, error_msg, reg_dt
                FROM TB_API_KEY_MNGR_MAIL_LOG
                WHERE 1=1
            """
            params = []
            
            if cd:
                query += " AND cd = %s"
                params.append(cd)
            if mail_tp:
                query += " AND mail_tp = %s"
                params.append(mail_tp)
            if success is not None:
                query += " AND success = %s"
                params.append(success)
            
            query += " ORDER BY reg_dt DESC LIMIT %s OFFSET %s"
            params.extend([page_size, offset])
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            logs = []
            for row in rows:
                logs.append({
                    'log_id': row['log_id'],
                    'cd': row['cd'],
                    'mail_tp': row['mail_tp'],
                    'sent_dt': row['sent_dt'].isoformat() if row['sent_dt'] else None,
                    'success': row['success'],
                    'error_msg': row['error_msg'],
                    'reg_dt': row['reg_dt'].strftime('%Y-%m-%d %H:%M:%S') if row['reg_dt'] else None
                })
            
            self.logger.debug(f"Fetched {len(logs)} mail send logs")
            return logs
            
        except Exception as e:
            self.logger.error(f"Error selecting mail send logs: {e}")
            raise
        finally:
            if 'conn' in locals():
                conn.close()

    def count_mail_send_logs(self, cd: str = None, mail_tp: str = None, success: bool = None) -> int:
        """메일 전송 이력 카운트 (필터 지원)"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            query = "SELECT COUNT(*) FROM TB_API_KEY_MNGR_MAIL_LOG WHERE 1=1"
            params = []
            
            if cd:
                query += " AND cd = %s"
                params.append(cd)
            if mail_tp:
                query += " AND mail_tp = %s"
                params.append(mail_tp)
            if success is not None:
                query += " AND success = %s"
                params.append(success)
            
            cursor.execute(query, params)
            count = cursor.fetchone()[0]
            
            return count
            
        except Exception as e:
            self.logger.error(f"Error counting mail send logs: {e}")
            raise
        finally:
            if 'conn' in locals():
                conn.close()

    # ==========================================
    # 스케줄 설정 관련 메서드 (신규 추가)
    # ==========================================

    def select_schedule_settings(self) -> List[Dict[str, Any]]:
        """스케줄 설정 조회 (3개 스케줄: 30일전, 7일전, 당일)"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            query = """
                SELECT schd_id, schd_tp, schd_cycle, schd_hour, 
                       is_active, last_run_dt, last_run_result, reg_dt, upd_dt
                FROM TB_API_KEY_MNGR_MAIL_SCHD
                ORDER BY 
                    CASE schd_tp 
                        WHEN '30일전' THEN 1 
                        WHEN '7일전' THEN 2 
                        WHEN '당일' THEN 3 
                        ELSE 4 
                    END
            """
            
            cursor.execute(query)
            rows = cursor.fetchall()
            
            settings = []
            for row in rows:
                settings.append({
                    'schd_id': row['schd_id'],
                    'schd_tp': row['schd_tp'],
                    'schd_cycle': row['schd_cycle'],
                    'schd_hour': row['schd_hour'],
                    'is_active': row['is_active'],
                    'last_run_dt': row['last_run_dt'].strftime('%Y-%m-%d %H:%M:%S') if row['last_run_dt'] else None,
                    'last_run_result': row['last_run_result'],
                    'reg_dt': row['reg_dt'].strftime('%Y-%m-%d %H:%M:%S') if row['reg_dt'] else None,
                    'upd_dt': row['upd_dt'].strftime('%Y-%m-%d %H:%M:%S') if row['upd_dt'] else None
                })
            
            self.logger.debug(f"Fetched {len(settings)} schedule settings")
            return settings
            
        except Exception as e:
            self.logger.error(f"Error selecting schedule settings: {e}")
            raise
        finally:
            if 'conn' in locals():
                conn.close()

    def upsert_schedule_settings(self, schedules: List[Dict[str, Any]]) -> bool:
        """스케줄 설정 저장/수정 (3개 스케줄 일괄 처리)"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            for schd in schedules:
                query = """
                    INSERT INTO TB_API_KEY_MNGR_MAIL_SCHD 
                        (schd_tp, schd_cycle, schd_hour, is_active)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (schd_tp) DO UPDATE
                    SET schd_cycle = EXCLUDED.schd_cycle,
                        schd_hour = EXCLUDED.schd_hour,
                        is_active = EXCLUDED.is_active,
                        upd_dt = NOW()
                """
                
                cursor.execute(query, (
                    schd.get('schd_tp'),
                    schd.get('schd_cycle', 1),
                    schd.get('schd_hour', 9),
                    schd.get('is_active', True)
                ))
            
            conn.commit()
            
            self.logger.debug("Successfully upserted schedule settings")
            return True
            
        except Exception as e:
            if 'conn' in locals():
                conn.rollback()
            self.logger.error(f"Error upserting schedule settings: {e}")
            raise
        finally:
            if 'conn' in locals():
                conn.close()

    def update_schedule_last_run(self, schd_tp: str, result: str) -> bool:
        """스케줄 마지막 실행 정보 업데이트"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            query = """
                UPDATE TB_API_KEY_MNGR_MAIL_SCHD
                SET last_run_dt = NOW(),
                    last_run_result = %s,
                    upd_dt = NOW()
                WHERE schd_tp = %s
            """
            
            cursor.execute(query, (result, schd_tp))
            conn.commit()
            
            self.logger.debug(f"Updated last run info for schedule {schd_tp}")
            return True
            
        except Exception as e:
            if 'conn' in locals():
                conn.rollback()
            self.logger.error(f"Error updating schedule last run: {e}")
            raise
        finally:
            if 'conn' in locals():
                conn.close()

    def select_cds_not_in_api_key_mngr(self, conn=None) -> List[Dict[str, Any]]:
        """Select all CD values from TB_MNGR_SETT that are not in TB_API_KEY_MNGR"""
        # Create a completely new method that handles connection properly
        data = []
        
        try:
            # Always create new connection
            if conn is None:
                local_conn = get_db_connection()
            else:
                local_conn = conn
            
            cursor = local_conn.cursor()
            
            query = """
                SELECT CD
                FROM TB_MNGR_SETT
                WHERE CD NOT IN (SELECT CD FROM TB_API_KEY_MNGR)
            """
            
            cursor.execute(query)
            rows = cursor.fetchall()
            
            # Convert to list of dictionaries
            for row in rows:
                data.append({'cd': row[0]})
            
            self.logger.debug(f"Fetched {len(data)} CD values not in TB_API_KEY_MNGR")
            
        except Exception as e:
            self.logger.error(f"Error selecting CD values not in API key manager: {e}")
            raise
        finally:
            # Only close connection if we created it
            if conn is None and 'local_conn' in locals():
                try:
                    local_conn.close()
                except:
                    pass
        
        return data

    def get_mail_setting_history(self, mail_tp, version):
        """
        메일 설정 이력 조회 (과거 버전)
        
        :param mail_tp: 메일 유형 (mail30, mail7, mail0)
        :param version: 버전 번호 (1=최신, 2=두번째 전, 3=세번째 전)
        :return: 설정 데이터 dict or None
        """
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # 최신 순으로 정렬하여 version에 해당하는 레코드 조회
            query = """
                SELECT mail_tp, subject, from_email, body, reg_dt
                FROM TB_API_KEY_MNGR_MAIL_SETT
                WHERE mail_tp = %s
                ORDER BY reg_dt DESC
                LIMIT 1 OFFSET %s
            """
            
            cursor.execute(query, (mail_tp, version - 1))
            row = cursor.fetchone()
            
            if row:
                return {
                    'mail_tp': row['mail_tp'],
                    'subject': row['subject'],
                    'from_email': row['from_email'],
                    'body': row['body'],
                    'reg_dt': row['reg_dt']
                }
            return None
            
        except Exception as e:
            self.logger.error(f"Error getting mail setting history for {mail_tp} version {version}: {e}")
            raise
        finally:
            if conn:
                conn.close()

    def count_mail_setting_history(self, mail_tp):
        """
        메일 설정 이력 개수 조회
        
        :param mail_tp: 메일 유형 (mail30, mail7, mail0)
        :return: 이력 개수
        """
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            query = """
                SELECT COUNT(*) FROM TB_API_KEY_MNGR_MAIL_SETT
                WHERE mail_tp = %s
            """
            
            cursor.execute(query, (mail_tp,))
            count = cursor.fetchone()[0]
            
            return count
            
        except Exception as e:
            self.logger.error(f"Error counting mail setting history for {mail_tp}: {e}")
            raise
        finally:
            if conn:
                conn.close()
