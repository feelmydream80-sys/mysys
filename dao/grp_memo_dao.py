# dao/grp_memo_dao.py
"""
DAO for handling group memo data in the database.
"""
import logging
from typing import List, Dict, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime

class GrpMemoDao:
    """
    Data Access Object for group memos.
    Handles all database operations for the TB_GRP_MEMO table.
    """
    def __init__(self, db_connection):
        self.conn = db_connection
        self.logger = logging.getLogger(self.__class__.__name__)

    def get_memo(self, grp_id: str, depth: int, memo_date: str) -> Optional[Dict]:
        """
        Retrieves a single memo by group ID, depth, and date.
        """
        query = """
            SELECT grp_id, memo_date, depth, content
            FROM TB_GRP_MEMO
            WHERE grp_id = %s AND depth = %s AND memo_date = %s
        """
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, (grp_id, depth, memo_date))
                result = cur.fetchone()
                return dict(result) if result else None
        except psycopg2.Error as e:
            self.logger.error(f"❌ DAO: Error fetching memo for {grp_id}: {e}", exc_info=True)
            raise

    def get_memos_by_group(self, grp_id: str) -> List[Dict]:
        """
        Retrieves all memos for a specific group.
        """
        query = """
            SELECT grp_id, memo_date, depth, content
            FROM TB_GRP_MEMO
            WHERE grp_id = %s
            ORDER BY memo_date DESC
        """
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, (grp_id,))
                results = cur.fetchall()
                return [dict(row) for row in results]
        except psycopg2.Error as e:
            self.logger.error(f"❌ DAO: Error fetching memos for group {grp_id}: {e}", exc_info=True)
            raise

    def insert_memo(self, grp_id: str, depth: int, memo_date: str, content: str, writer_id: str):
        """
        Inserts a new memo into the database.
        """
        query = """
            INSERT INTO TB_GRP_MEMO (grp_id, memo_date, depth, content, writer_id, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        try:
            with self.conn.cursor() as cur:
                cur.execute(query, (grp_id, memo_date, depth, content, writer_id, datetime.now()))
            self.conn.commit()
            self.logger.info(f"✅ DAO: Memo inserted for {grp_id} on {memo_date}")
        except psycopg2.Error as e:
            self.conn.rollback()
            self.logger.error(f"❌ DAO: Error inserting memo for {grp_id}: {e}", exc_info=True)
            raise

    def update_memo(self, grp_id: str, depth: int, memo_date: str, content: str, writer_id: str):
        """
        Updates an existing memo in the database.
        """
        query = """
            UPDATE TB_GRP_MEMO
            SET content = %s, writer_id = %s, updated_at = %s
            WHERE grp_id = %s AND depth = %s AND memo_date = %s
        """
        try:
            with self.conn.cursor() as cur:
                cur.execute(query, (content, writer_id, datetime.now(), grp_id, depth, memo_date))
            self.conn.commit()
            self.logger.info(f"✅ DAO: Memo updated for {grp_id} on {memo_date}")
        except psycopg2.Error as e:
            self.conn.rollback()
            self.logger.error(f"❌ DAO: Error updating memo for {grp_id}: {e}", exc_info=True)
            raise

    def delete_memo(self, grp_id: str, depth: int, memo_date: str):
        """
        Deletes a memo from the database.
        """
        query = """
            DELETE FROM TB_GRP_MEMO
            WHERE grp_id = %s AND depth = %s AND memo_date = %s
        """
        try:
            with self.conn.cursor() as cur:
                cur.execute(query, (grp_id, depth, memo_date))
            self.conn.commit()
            self.logger.info(f"✅ DAO: Memo deleted for {grp_id} on {memo_date}")
        except psycopg2.Error as e:
            self.conn.rollback()
            self.logger.error(f"❌ DAO: Error deleting memo for {grp_id}: {e}", exc_info=True)
            raise

    def get_all_memos_with_dates(self, grp_ids: List[str], dates: List[str]) -> List[Dict]:
        """
        Retrieves all memos for given group IDs and dates.
        Used for preloading memo status on calendar.
        """
        if not grp_ids or not dates:
            return []
        
        query = """
            SELECT grp_id, memo_date, depth, content
            FROM TB_GRP_MEMO
            WHERE grp_id = ANY(%s) AND memo_date = ANY(%s::date[])
        """
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, (grp_ids, dates))
                results = cur.fetchall()
                return [dict(row) for row in results]
        except psycopg2.Error as e:
            self.logger.error(f"❌ DAO: Error fetching memos: {e}", exc_info=True)
            raise