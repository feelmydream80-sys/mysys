import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

import sys
sys.path.append('.')
from msys_app import create_app
from datetime import datetime

def insert_actual_api_key_data():
    print("=== 실제 API 키 관리 데이터 삽입 ===")
    
    actual_data = [
        ("CD1001", 1, "2026-02-26", "b8c6ccce6e1b4abaa804de734aa166b5"),
        ("CD1002", 1, "2026-02-26", "b6aced4435c849b08e9ac29b4bfb2419"),
        ("CD101", 1, "2026-03-03", "MffJsbW_DkzeFFBuu6GgwyplF1xf4Jpa"),
        ("CD102", 1, "2026-03-03", "MffJsbW_DkzeFFBuu6GgwyplF1xf4Jpa"),
        ("CD103", 1, "2026-03-03", "MffJsbW_DkzeFFBuu6GgwyplF1xf4Jpa"),
        ("CD104", 1, "2026-03-03", "MffJsbW_DkzeFFBuu6GgwyplF1xf4Jpa"),
        ("CD1111101", 1, "2026-03-03", None),
        ("CD1111102", 1, "2026-03-03", None),
        ("CD301", 1, "2026-03-25", None),
        ("CD302", 1, "2026-03-25", None),
        ("CD303", 1, "2026-03-25", None),
        ("CD309", 1, "2026-03-25", None),
        ("CD310", 1, "2026-03-25", None),
        ("CD311", 1, "2026-03-25", None),
        ("CD312", 1, "2026-03-25", None),
        ("CD313", 1, "2026-03-25", None),
        ("CD314", 1, "2026-03-25", None),
        ("CD315", 1, "2026-03-25", None),
        ("CD316", 1, "2026-03-25", None),
        ("CD318", 1, "2026-03-25", None),
        ("CD319", 1, "2026-03-25", None),
        ("CD320", 1, "2026-03-25", None),
        ("CD321", 1, "2026-03-25", None),
        ("CD322", 1, "2026-03-25", None),
        ("CD323", 1, "2026-03-25", None),
        ("CD324", 1, "2026-03-25", None)
    ]
    
    try:
        app = create_app()
        
        with app.app_context():
            from msys.database import get_db_connection
            
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # 기존 데이터 삭제
            cursor.execute("DELETE FROM tb_api_key_mngr")
            
            # 실제 데이터 삽입
            insert_query = """
                INSERT INTO tb_api_key_mngr (cd, due, start_dt, api_ownr_email_addr)
                VALUES (%s, %s, %s, %s)
            """
            
            for cd, due, start_dt, api_ownr_email_addr in actual_data:
                start_dt_obj = datetime.strptime(start_dt, '%Y-%m-%d').date()
                cursor.execute(insert_query, (cd, due, start_dt_obj, api_ownr_email_addr))
            
            conn.commit()
            print(f"성공적으로 {len(actual_data)}개의 데이터를 삽입했습니다.")
            
            # 삽입된 데이터 확인
            cursor.execute("SELECT * FROM tb_api_key_mngr")
            inserted_data = cursor.fetchall()
            print(f"\n삽입된 데이터 개수: {len(inserted_data)}")
            
            cursor.close()
            conn.close()
            
    except Exception as e:
        print(f"\n오류 발생: {e}")
        import traceback
        print("\n상세 오류 스택:")
        print(traceback.format_exc())

if __name__ == "__main__":
    insert_actual_api_key_data()