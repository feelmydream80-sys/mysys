import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

import sys
sys.path.append('.')
from msys_app import create_app

def direct_db_query():
    print("=== 직접 SQL 쿼리로 API 키 관리 데이터 조회 ===")
    
    try:
        app = create_app()
        
        with app.app_context():
            from msys.database import get_db_connection
            
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # 직접 SQL 쿼리 실행
            cursor.execute("SELECT * FROM tb_api_key_mngr")
            rows = cursor.fetchall()
            
            print(f"SQL 쿼리 결과 개수: {len(rows)}")
            
            if rows:
                print("\n=== SQL 쿼리 결과 ===")
                for row in rows:
                    print(row)
                
                print("\n=== 컬럼 정보 ===")
                column_names = [desc[0] for desc in cursor.description]
                print("컬럼명:", column_names)
                
            cursor.close()
            conn.close()
            
    except Exception as e:
        print(f"\n오류 발생: {e}")
        import traceback
        print("\n상세 오류 스택:")
        print(traceback.format_exc())

if __name__ == "__main__":
    direct_db_query()