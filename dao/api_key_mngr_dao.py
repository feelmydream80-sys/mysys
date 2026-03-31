"""TB_API_KEY_MNGR 테이블에 대한 DAO (Data Access Object)"""

from msys.database import get_db_connection
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
                    'api_ownr_email_addr': row[2],
                    'due': row[3],
                    'start_dt': row[4]
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
                    'api_ownr_email_addr': row[2],
                    'due': row[3],
                    'start_dt': row[4]
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