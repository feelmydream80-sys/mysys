"""
API 키 관리 메뉴 SQL 실행 스크립트
"""
import sys
import os

# 프로젝트 경로 설정
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from msys_app import create_app
from msys.database import get_db_connection

def execute_sql():
    """SQL 실행 함수"""
    app = create_app()
    
    with app.app_context():
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # SQL 파일 읽기
            with open('etc/add_api_key_mngr_menu.sql', 'r', encoding='utf-8') as f:
                sql = f.read()
            
            # SQL 실행
            for statement in sql.split(';'):
                statement = statement.strip()
                if statement:
                    cursor.execute(statement)
                    print(f"SQL 실행 성공: {statement[:50]}...")
            
            conn.commit()
            print("메뉴 설정이 성공적으로 적용되었습니다!")
            
        except Exception as e:
            print(f"SQL 실행 오류: {e}")
            import traceback
            print(traceback.format_exc())
        finally:
            if 'conn' in locals():
                conn.close()

if __name__ == '__main__':
    execute_sql()
