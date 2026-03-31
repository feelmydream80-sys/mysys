"""
TB_CON_MST 데이터 조회 테스트 스크립트
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from msys_app import create_app
from dao.con_mst_dao import ConMstDAO

app = create_app()

with app.app_context():
    print("=== TB_CON_MST 데이터 조회 테스트 ===")
    print()
    
    test_cds = ["CD401", "CD402", "CD403", "CD1003", "CD105", "CD111", "CD201"]
    
    from msys.database import get_db_connection
    conn = None
    try:
        conn = get_db_connection()
        con_mst_dao = ConMstDAO(conn)
        
        for cd in test_cds:
            print("CD: {} 조회".format(cd))
            try:
                data = con_mst_dao.get_mst_data_by_cd(cd)
                if data:
                    print("성공: {}".format(data))
                    print("   item10: {}".format(data.get('item10')))
                    print("   update_dt: {}".format(data.get('update_dt')))
                else:
                    print("데이터 없음")
            except Exception as e:
                print("오류: {}".format(e))
            print()
    except Exception as e:
        print("DB 연결 오류: {}".format(e))
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass