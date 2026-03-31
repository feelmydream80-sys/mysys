"""
TB_CON_MST 데이터 조회 테스트 스크립트 (간소화된 버전)
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from msys_app import create_app

app = create_app()

with app.app_context():
    print("=== TB_CON_MST 데이터 조회 테스트 (간소화) ===")
    print()
    
    from msys.database import get_db_connection
    conn = None
    try:
        conn = get_db_connection()
        
        # 직접 SQL 쿼리 실행
        query = "SELECT cd, item10, update_dt FROM tb_con_mst WHERE cd = %s"
        test_cds = ["CD401", "CD402", "CD403", "CD1003", "CD105", "CD111", "CD201"]
        
        for cd in test_cds:
            print("CD: {} 조회".format(cd))
            try:
                with conn.cursor() as cur:
                    cur.execute(query, (cd,))
                    result = cur.fetchone()
                    if result:
                        print("성공:")
                        print("   CD: {}".format(result[0]))
                        print("   ITEM10: {}".format(result[1]))
                        print("   UPDATE_DT: {}".format(result[2]))
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