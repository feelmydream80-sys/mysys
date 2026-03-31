"""
DB 연결 확인 스크립트
"""
import sys
import os

# 프로젝트 경로 설정
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from msys_app import create_app
from msys.database import get_db_connection

def check_db_connection():
    """DB 연결 확인 함수"""
    app = create_app()
    
    with app.app_context():
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # TB_API_KEY_MNGR 테이블 데이터 확인
            cursor.execute("SELECT COUNT(*) FROM TB_API_KEY_MNGR")
            api_key_count = cursor.fetchone()[0]
            print(f"TB_API_KEY_MNGR 테이블 데이터 수: {api_key_count}")
            
            # TB_MENU 테이블 데이터 확인 (API 키 관리 메뉴)
            cursor.execute("SELECT * FROM TB_MENU WHERE MENU_ID = 'api_key_mngr'")
            menu_data = cursor.fetchone()
            if menu_data:
                print(f"API 키 관리 메뉴가 존재합니다: {menu_data}")
            else:
                print("API 키 관리 메뉴가 존재하지 않습니다.")
                
            # TB_USER_AUTH_CTRL 테이블 데이터 확인 (관리자 권한)
            cursor.execute("SELECT * FROM TB_USER_AUTH_CTRL WHERE USER_ID = 'admin' AND MENU_ID = 'api_key_mngr'")
            auth_data = cursor.fetchone()
            if auth_data:
                print(f"관리자 권한이 설정되어 있습니다: {auth_data}")
            else:
                print("관리자 권한이 설정되어 있지 않습니다.")
                
            # TB_MNGR_SETT 테이블 데이터 확인 (CD 값)
            cursor.execute("SELECT DISTINCT CD FROM TB_MNGR_SETT")
            cd_list = [row[0] for row in cursor.fetchall()]
            print(f"TB_MNGR_SETT에 있는 CD 값 개수: {len(cd_list)}")
            if len(cd_list) > 0:
                print(f"CD 값: {', '.join(cd_list)}")
                
            # TB_CON_MST 테이블 데이터 확인 (ITEM10 값)
            cursor.execute("SELECT CD, ITEM10, UPDATE_DT FROM TB_CON_MST WHERE CD IN (%s)" % ', '.join(['%s'] * len(cd_list)), cd_list)
            mst_data = cursor.fetchall()
            print(f"TB_CON_MST에 있는 CD/ITEM10 데이터 수: {len(mst_data)}")
            
        except Exception as e:
            print(f"DB 연결 확인 중 오류: {e}")
            import traceback
            print(traceback.format_exc())
        finally:
            if 'conn' in locals():
                conn.close()

if __name__ == '__main__':
    check_db_connection()