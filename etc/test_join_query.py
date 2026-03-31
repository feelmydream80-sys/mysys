#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""TB_API_KEY_MNGR와 TB_CON_MST JOIN 쿼리 테스트"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from msys_app import create_app
import config
from msys.database import get_db_connection

def test_join_query():
    """JOIN 쿼리 테스트"""
    app = create_app()
    with app.app_context():
        # DB 연결
        conn = get_db_connection()
        try:
            # JOIN 쿼리 실행
            query = """
                SELECT 
                    a.cd,
                    b.ITEM10 as api_key,
                    a.api_ownr_email_addr,
                    a.due,
                    a.start_dt
                FROM TB_API_KEY_MNGR a
                LEFT JOIN TB_CON_MST b ON a.cd = b.CD
                WHERE a.cd = 'CD1001'
            """
            
            cursor = conn.cursor()
            cursor.execute(query)
            result = cursor.fetchall()
            
            print("=== JOIN 쿼리 결과 ===")
            if result:
                for row in result:
                    print(row)
            else:
                print("결과 없음")
                
        except Exception as e:
            print(f"쿼리 실행 오류: {e}")
        finally:
            # 연결 닫기
            if conn:
                conn.close()

if __name__ == "__main__":
    test_join_query()