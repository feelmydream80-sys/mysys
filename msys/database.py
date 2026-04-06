import psycopg2
from psycopg2.extras import RealDictCursor
import os
import logging
from flask import g
from psycopg2 import pool
from msys.config import config

# --- Connection Pool ---
db_pool = None

def init_db_pool():
    """
    애플리케이션 시작 시 호출되어 데이터베이스 커넥션 풀을 초기화합니다.
    """
    global db_pool
    if db_pool is None:
        try:
            db_config_with_encoding = config.DB_CONFIG.copy()
            db_config_with_encoding['client_encoding'] = 'UTF8'
            db_pool = pool.SimpleConnectionPool(
                minconn=1,
                maxconn=20,  # 테스트를 위해 최대 연결 수 증가
                **db_config_with_encoding
            )
            logging.info("✅ DB 커넥션 풀이 성공적으로 초기화되었습니다.")
        except Exception as e:
            logging.error(f"❌ DB 커넥션 풀 초기화 실패: {e}", exc_info=True)
            raise

def get_db_connection():
    """
    요청 컨텍스트(g)를 사용하여 커넥션 풀에서 데이터베이스 연결을 가져옵니다.
    g에 연결이 없으면 풀에서 새로 가져오고, 있으면 기존 연결을 반환합니다.
    """
    if 'db_conn' not in g:
        if db_pool is None:
            init_db_pool()
        try:
            g.db_conn = db_pool.getconn()
            logging.debug("DB 커넥션을 풀에서 가져왔습니다.")
        except Exception as e:
            logging.error(f"❌ DB 커넥션 풀에서 연결 가져오기 실패: {e}", exc_info=True)
            raise
    return g.db_conn

def close_db_connection(e=None):
    """
    요청이 종료될 때 데이터베이스 연결을 풀에 반환합니다.
    """
    db_conn = g.pop('db_conn', None)
    if db_conn is not None:
        db_pool.putconn(db_conn)
        logging.debug("DB 커넥션을 풀에 반환했습니다.")

def get_db_cursor(conn):
    """
    주어진 DB 연결(conn)에 대해 RealDictCursor를 사용하여 딕셔너리 형태의 결과를 반환하는 커서를 생성합니다.
    """
    return conn.cursor(cursor_factory=RealDictCursor)
