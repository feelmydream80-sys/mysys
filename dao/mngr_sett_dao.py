# dao/admin_settings_dao.py
"""
DAO for handling administrator settings in the database.
"""
import logging
from typing import List, Dict, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from dao.sql_loader import load_sql

class MngrSettDAO:
    """
    Data Access Object for admin settings.
    Handles all database operations for the TB_MNGR_SETT table.
    """
    def __init__(self, db_connection):
        self.conn = db_connection
        self.logger = logging.getLogger(self.__class__.__name__)

    def get_settings_by_cd(self, cd: str) -> Optional[Dict]:
        """
        Retrieves settings for a specific cd from the database.
        """
        query = load_sql('mngr_sett/get_mngr_sett.sql')
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, (cd,))
                result = cur.fetchone()
                if result:
                    return dict(result)
                return None
        except psycopg2.Error as e:
            self.logger.error(f"DAO: Error fetching settings for CD {cd}: {e}", exc_info=True)
            raise

    def insert_settings(self, settings_data: Dict):
        """
        Inserts new settings into the database.
        """
        query = load_sql('mngr_sett/insert_mngr_sett.sql')
        # The order of values must match the order of columns in the INSERT query
        values = (
            settings_data.get('cd'),
            settings_data.get('cnn_failr_thrs_val'),
            settings_data.get('cnn_warn_thrs_val'),
            settings_data.get('cnn_failr_icon_id'),
            settings_data.get('cnn_failr_wrd_colr'),
            settings_data.get('cnn_warn_icon_id'),
            settings_data.get('cnn_warn_wrd_colr'),
            settings_data.get('cnn_sucs_icon_id'),
            settings_data.get('cnn_sucs_wrd_colr'),
            settings_data.get('dly_sucs_rt_thrs_val'),
            settings_data.get('dd7_sucs_rt_thrs_val'),
            settings_data.get('mthl_sucs_rt_thrs_val'),
            settings_data.get('mc6_sucs_rt_thrs_val'),
            settings_data.get('yy1_sucs_rt_thrs_val'),
            settings_data.get('sucs_rt_sucs_icon_id'),
            settings_data.get('sucs_rt_sucs_wrd_colr'),
            settings_data.get('sucs_rt_warn_icon_id'),
            settings_data.get('sucs_rt_warn_wrd_colr'),
            settings_data.get('chrt_colr'),
            settings_data.get('chrt_dsp_yn'),
            settings_data.get('grass_chrt_min_colr'),
            settings_data.get('grass_chrt_max_colr')
        )
        self.logger.info(f"DAO: Insert values: {values}")
        try:
            with self.conn.cursor() as cur:
                cur.execute(query, values)
        except psycopg2.Error as e:
            self.logger.error(f"DAO: Error inserting settings for CD {settings_data.get('cd')}: {e}", exc_info=True)
            raise

    def update_settings(self, settings_data: Dict):
        """
        Updates existing settings in the database.
        """
        query = load_sql('mngr_sett/update_mngr_sett.sql')
        # The order of values must match the order of columns in the UPDATE query
        values = (
            settings_data.get('cnn_failr_thrs_val'),
            settings_data.get('cnn_warn_thrs_val'),
            settings_data.get('cnn_failr_icon_id'),
            settings_data.get('cnn_failr_wrd_colr'),
            settings_data.get('cnn_warn_icon_id'),
            settings_data.get('cnn_warn_wrd_colr'),
            settings_data.get('cnn_sucs_icon_id'),
            settings_data.get('cnn_sucs_wrd_colr'),
            settings_data.get('dly_sucs_rt_thrs_val'),
            settings_data.get('dd7_sucs_rt_thrs_val'),
            settings_data.get('mthl_sucs_rt_thrs_val'),
            settings_data.get('mc6_sucs_rt_thrs_val'),
            settings_data.get('yy1_sucs_rt_thrs_val'),
            settings_data.get('sucs_rt_sucs_icon_id'),
            settings_data.get('sucs_rt_sucs_wrd_colr'),
            settings_data.get('sucs_rt_warn_icon_id'),
            settings_data.get('sucs_rt_warn_wrd_colr'),
            settings_data.get('chrt_colr'),
            settings_data.get('chrt_dsp_yn'),
            settings_data.get('grass_chrt_min_colr'),
            settings_data.get('grass_chrt_max_colr'),
            settings_data.get('cd')  # for the WHERE clause
        )
        try:
            with self.conn.cursor() as cur:
                cur.execute(query, values)
        except psycopg2.Error as e:
            self.logger.error(f"DAO: Error updating settings for CD {settings_data.get('cd')}: {e}", exc_info=True)
            raise

    def get_all_settings(self) -> List[Dict]:
        """
        Retrieves all settings from the database.
        """
        query = load_sql('mngr_sett/get_all_mngr_sett.sql')
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query)
                results = cur.fetchall()
                return [dict(row) for row in results]
        except psycopg2.Error as e:
            self.logger.error(f"DAO: Error fetching all settings: {e}", exc_info=True)
            raise

    def delete_settings(self, cd: str):
        """
        Deletes settings for a specific cd from the database.
        """
        query = load_sql('mngr_sett/delete_mngr_sett.sql')
        try:
            with self.conn.cursor() as cur:
                cur.execute(query, (cd,))
        except psycopg2.Error as e:
            self.logger.error(f"DAO: Error deleting settings for CD {cd}: {e}", exc_info=True)
            raise

    def get_all_menu_settings(self) -> List[Dict]:
        """
        Retrieves all menu settings from the database.
        """
        query = load_sql('mngr_sett/get_all_menu_settings.sql')
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query)
                results = cur.fetchall()
                # self.logger.info(f"DAO MENU DATA: {results}")
                return [dict(row) for row in results]
        except psycopg2.Error as e:
            self.logger.error(f"DAO: Error fetching all menu settings: {e}", exc_info=True)
            raise

    def get_menu_by_url(self, url: str) -> Optional[Dict]:
        """
        Retrieves a menu by its URL from the database.
        """
        query = "SELECT * FROM tb_menu WHERE menu_url = %s;"
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, (url,))
                result = cur.fetchone()
                if result:
                    return dict(result)
                return None
        except psycopg2.Error as e:
            self.logger.error(f"DAO: Error fetching menu for URL {url}: {e}", exc_info=True)
            raise
