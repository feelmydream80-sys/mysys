# dao/popup_dao.py
"""
DAO for handling popup data in the database.
"""
import logging
from typing import List, Dict, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.datetime_utils import get_kst_now

class PopupDao:
    """
    Data Access Object for popups.
    Handles all database operations for the TB_POPUP_MST table.
    """
    def __init__(self, db_connection):
        self.conn = db_connection
        self.logger = logging.getLogger(self.__class__.__name__)

    def get_all_popups(self, include_inactive: bool = False) -> List[Dict]:
        """
        Retrieves all popups from the database.
        
        Args:
            include_inactive: If True, include inactive popups as well.
        
        Returns:
            List of popup dictionaries.
        """
        query = """
            SELECT POPUP_ID, TITL, CONT, IMG_PATH, LNK_URL, START_DT, END_DT,
                   USE_YN, DISP_ORD, DISP_TYPE, WIDTH, HEIGHT, BG_COLR,
                   HIDE_OPT_YN, HIDE_DAYS_MAX, LOC,
                   REG_USER_ID, REG_DT, UPD_USER_ID, UPD_DT
            FROM TB_POPUP_MST
            WHERE DEL_YN = 'N'
        """
        if not include_inactive:
            query += " AND USE_YN = 'Y'"
        query += " ORDER BY DISP_ORD ASC, REG_DT DESC"
        
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                self.logger.info(f"🔍 [PIPELINE] DAO SQL 실행: {query[:100]}...")
                cur.execute(query)
                results = cur.fetchall()
                popups = [dict(row) for row in results]
                self.logger.info(f"🔍 [PIPELINE] DAO 조회 결과: {len(popups)}개")
                if popups:
                    self.logger.info(f"🔍 [PIPELINE] DAO 첫 번째 데이터: popup_id={popups[0].get('popup_id')}, titl={popups[0].get('titl')}")
                return popups
        except psycopg2.Error as e:
            self.logger.error(f"❌ DAO: Error fetching all popups: {e}", exc_info=True)
            raise

    def get_popup_by_id(self, popup_id: int) -> Optional[Dict]:
        """
        Retrieves a single popup by its ID.
        
        Args:
            popup_id: The ID of the popup to retrieve.
        
        Returns:
            Popup dictionary if found, None otherwise.
        """
        query = """
            SELECT POPUP_ID, TITL, CONT, IMG_PATH, LNK_URL, START_DT, END_DT,
                   USE_YN, DISP_ORD, DISP_TYPE, WIDTH, HEIGHT, BG_COLR,
                   HIDE_OPT_YN, HIDE_DAYS_MAX, LOC,
                   REG_USER_ID, REG_DT, UPD_USER_ID, UPD_DT
            FROM TB_POPUP_MST
            WHERE POPUP_ID = %s AND DEL_YN = 'N'
        """
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, (popup_id,))
                result = cur.fetchone()
                return dict(result) if result else None
        except psycopg2.Error as e:
            self.logger.error(f"❌ DAO: Error fetching popup by ID {popup_id}: {e}", exc_info=True)
            raise

    def get_active_popups(self, current_time: str) -> List[Dict]:
        """
        Retrieves active popups that are currently visible.
        
        Args:
            current_time: Current time string in 'YYYY-MM-DD HH:MM:SS' format.
        
        Returns:
            List of active popup dictionaries.
        """
        query = """
            SELECT POPUP_ID, TITL, CONT, IMG_PATH, LNK_URL, START_DT, END_DT,
                   USE_YN, DISP_ORD, DISP_TYPE, WIDTH, HEIGHT, BG_COLR,
                   HIDE_OPT_YN, HIDE_DAYS_MAX, LOC,
                   REG_USER_ID, REG_DT, UPD_USER_ID, UPD_DT
            FROM TB_POPUP_MST
            WHERE USE_YN = 'Y'
              AND DEL_YN = 'N'
              AND START_DT <= %s
              AND END_DT >= %s
            ORDER BY DISP_ORD ASC, REG_DT DESC
        """
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, (current_time, current_time))
                results = cur.fetchall()
                return [dict(row) for row in results]
        except psycopg2.Error as e:
            self.logger.error(f"❌ DAO: Error fetching active popups: {e}", exc_info=True)
            raise

    def insert_popup(self, data: Dict) -> int:
        """
        Inserts a new popup into the database.
        
        Args:
            data: Dictionary containing popup data.
        
        Returns:
            The ID of the newly inserted popup.
        """
        query = """
            INSERT INTO TB_POPUP_MST (
                TITL, CONT, IMG_PATH, LNK_URL, START_DT, END_DT,
                USE_YN, DISP_ORD, DISP_TYPE, WIDTH, HEIGHT, BG_COLR,
                HIDE_OPT_YN, HIDE_DAYS_MAX, LOC,
                REG_USER_ID, REG_DT
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING POPUP_ID
        """
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, (
                    data.get('TITL'),
                    data.get('CONT'),
                    data.get('IMG_PATH'),
                    data.get('LNK_URL'),
                    data.get('START_DT'),
                    data.get('END_DT'),
                    data.get('USE_YN', 'Y'),
                    data.get('DISP_ORD', 999),
                    data.get('DISP_TYPE', 'MODAL'),
                    data.get('WIDTH', 500),
                    data.get('HEIGHT'),
                    data.get('BG_COLR', '#FFFFFF'),
                    data.get('HIDE_OPT_YN', 'Y'),
                    data.get('HIDE_DAYS_MAX', 7),
                    data.get('LOC', 'CENTER'),
                    data.get('REG_USER_ID'),
                    get_kst_now().strftime('%Y-%m-%d %H:%M:%S')
                ))
                result = cur.fetchone()
                self.conn.commit()
                popup_id = result['popup_id'] if result else None
                self.logger.info(f"✅ DAO: Popup inserted with ID {popup_id}")
                return popup_id
        except psycopg2.Error as e:
            self.conn.rollback()
            self.logger.error(f"❌ DAO: Error inserting popup: {e}", exc_info=True)
            raise

    def update_popup(self, popup_id: int, data: Dict):
        """
        Updates an existing popup in the database.
        
        Args:
            popup_id: The ID of the popup to update.
            data: Dictionary containing updated popup data.
        """
        query = """
            UPDATE TB_POPUP_MST
            SET TITL = %s,
                CONT = %s,
                IMG_PATH = %s,
                LNK_URL = %s,
                START_DT = %s,
                END_DT = %s,
                USE_YN = %s,
                DISP_ORD = %s,
                DISP_TYPE = %s,
                WIDTH = %s,
                HEIGHT = %s,
                BG_COLR = %s,
                HIDE_OPT_YN = %s,
                HIDE_DAYS_MAX = %s,
                LOC = %s,
                UPD_USER_ID = %s,
                UPD_DT = %s
            WHERE POPUP_ID = %s
        """
        try:
            with self.conn.cursor() as cur:
                cur.execute(query, (
                    data.get('TITL'),
                    data.get('CONT'),
                    data.get('IMG_PATH'),
                    data.get('LNK_URL'),
                    data.get('START_DT'),
                    data.get('END_DT'),
                    data.get('USE_YN', 'Y'),
                    data.get('DISP_ORD', 999),
                    data.get('DISP_TYPE', 'MODAL'),
                    data.get('WIDTH', 500),
                    data.get('HEIGHT'),
                    data.get('BG_COLR', '#FFFFFF'),
                    data.get('HIDE_OPT_YN', 'Y'),
                    data.get('HIDE_DAYS_MAX', 7),
                    data.get('LOC', 'CENTER'),
                    data.get('UPD_USER_ID'),
                    get_kst_now().strftime('%Y-%m-%d %H:%M:%S'),
                    popup_id
                ))
            self.conn.commit()
            self.logger.info(f"✅ DAO: Popup {popup_id} updated")
        except psycopg2.Error as e:
            self.conn.rollback()
            self.logger.error(f"❌ DAO: Error updating popup {popup_id}: {e}", exc_info=True)
            raise

    def delete_popup(self, popup_id: int, user_id: str):
        """
        Deletes a popup from the database (soft delete by setting DEL_YN = 'Y').
        
        Args:
            popup_id: The ID of the popup to delete.
            user_id: The ID of the user performing the deletion.
        """
        query = """
            UPDATE TB_POPUP_MST
            SET DEL_YN = 'Y',
                UPD_USER_ID = %s,
                UPD_DT = %s
            WHERE POPUP_ID = %s
        """
        try:
            with self.conn.cursor() as cur:
                cur.execute(query, (
                    user_id,
                    get_kst_now().strftime('%Y-%m-%d %H:%M:%S'),
                    popup_id
                ))
            self.conn.commit()
            self.logger.info(f"✅ DAO: Popup {popup_id} soft-deleted by user {user_id}")
        except psycopg2.Error as e:
            self.conn.rollback()
            self.logger.error(f"❌ DAO: Error deleting popup {popup_id}: {e}", exc_info=True)
            raise
