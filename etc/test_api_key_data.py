"""
API 키 관리 데이터 가져오기 테스트
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from msys_app import create_app
from service.api_key_mngr_service import ApiKeyMngrService
from msys.database import get_db_connection

def test_api_key_data():
    """API 키 관리 데이터 조회 테스트"""
    app = create_app()
    
    with app.app_context():
        service = ApiKeyMngrService()
        
        print("=" * 60)
        print("API 키 관리 데이터 조회 테스트")
        print("=" * 60)
        
        try:
            # 1. 서비스 호출
            print("\n1. 서비스 호출 결과:")
            print("-" * 60)
            
            data = service.get_all_api_key_mngr()
            
            print(f"데이터 개수: {len(data)}")
            print(f"데이터 타입: {type(data)}")
            
            if len(data) > 0:
                print(f"\n첫 번째 데이터:")
                first_item = data[0]
                print(f"  타입: {type(first_item)}")
                print(f"  내용: {first_item}")
                
                print(f"\n키 목록:")
                for key in first_item.keys():
                    print(f"  - {key} (값 타입: {type(first_item[key])})")
            
            # 2. DAO 직접 호출
            print("\n" + "=" * 60)
            print("DAO 직접 호출 테스트")
            print("=" * 60)
            
            from dao.api_key_mngr_dao import ApiKeyMngrDao
            
            dao = ApiKeyMngrDao()
            dao_data = dao.select_all()
            
            print(f"DAO 데이터 개수: {len(dao_data)}")
            
            if len(dao_data) > 0:
                print(f"\nDAO 첫 번째 데이터:")
                print(dao_data[0])
        
        except Exception as e:
            print(f"\n오류: {e}")
            import traceback
            print(traceback.format_exc())

        try:
            # 3. DB 직접 쿼리
            print("\n" + "=" * 60)
            print("DB 직접 쿼리 테스트")
            print("=" * 60)
            
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("SELECT CD, DUE, START_DT, API_OWNR_EMAIL_ADDR FROM TB_API_KEY_MNGR")
            rows = cursor.fetchall()
            
            print(f"DB 쿼리 결과 개수: {len(rows)}")
            
            if len(rows) > 0:
                print(f"\nDB 첫 번째 행:")
                print(rows[0])
                
                print(f"\n컬럼 정보:")
                for desc in cursor.description:
                    print(f"  - {desc[0]} ({desc[1]})")
        
        except Exception as e:
            print(f"\n오류: {e}")
            import traceback
            print(traceback.format_exc())
        finally:
            if 'conn' in locals():
                conn.close()


if __name__ == "__main__":
    test_api_key_data()