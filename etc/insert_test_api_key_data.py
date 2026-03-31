import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

import sys
sys.path.append('.')
from msys_app import create_app

def insert_test_data():
    print("=== 테스트 데이터 삽입 ===")
    
    try:
        app = create_app()
        
        with app.app_context():
            from msys.database import get_db_connection
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # 테스트 데이터 삽입
            test_data = [
                ("CD1001", 1, "2023-01-01", "admin@example.com"),
                ("CD1002", 3, "2024-06-15", "user1@example.com"),
                ("CD1003", 1, "2025-12-25", "user2@example.com"),
                ("CD1004", 5, "2022-03-10", "manager@example.com"),
            ]
            
            # 기존 데이터 삭제
            cursor.execute("DELETE FROM TB_API_KEY_MNGR")
            print(f"기존 데이터 삭제: {cursor.rowcount} 개")
            
            # 새로운 데이터 삽입
            for cd, due, start_dt, api_ownr_email_addr in test_data:
                cursor.execute(
                    "INSERT INTO TB_API_KEY_MNGR (CD, DUE, START_DT, API_OWNR_EMAIL_ADDR) VALUES (%s, %s, %s, %s)",
                    (cd, due, start_dt, api_ownr_email_addr)
                )
            
            conn.commit()
            print(f"테스트 데이터 삽입: {cursor.rowcount} 개")
            
            # 삽입된 데이터 확인
            print("\n=== 삽입된 데이터 ===")
            cursor.execute("SELECT * FROM TB_API_KEY_MNGR")
            columns = [desc[0] for desc in cursor.description]
            for row in cursor.fetchall():
                row_dict = dict(zip(columns, row))
                print(row_dict)
                
    except Exception as e:
        print(f"\n오류 발생: {e}")
        import traceback
        print("\n상세 오류 스택:")
        print(traceback.format_exc())

if __name__ == "__main__":
    insert_test_data()