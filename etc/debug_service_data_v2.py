import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

import sys
sys.path.append('.')
from msys_app import create_app

def debug_service_data():
    print("=== 서비스 메서드 데이터 조회 디버그 (v2) ===")
    
    # 각 호출마다 새로운 Flask 애플리케이션 컨텍스트 생성
    print("\n--- 1. get_all_api_key_mngr 호출 ---")
    app1 = create_app()
    with app1.app_context():
        from service.api_key_mngr_service import ApiKeyMngrService
        service = ApiKeyMngrService()
        try:
            data = service.get_all_api_key_mngr()
            print(f"   개수: {len(data)}")
            if data:
                print("   첫 번째 데이터:")
                print("   ", data[0])
        except Exception as e:
            print(f"   오류: {e}")
            import traceback
            print(traceback.format_exc())
    
                
    print("\n--- 3. DAO 직접 호출 ---")
    app3 = create_app()
    with app3.app_context():
        from dao.api_key_mngr_dao import ApiKeyMngrDao
        dao = ApiKeyMngrDao()
        try:
            dao_data = dao.select_all()
            print(f"   개수: {len(dao_data)}")
            if dao_data:
                print("   첫 번째 데이터:")
                print("   ", dao_data[0])
        except Exception as e:
            print(f"   오류: {e}")
            import traceback
            print(traceback.format_exc())

if __name__ == "__main__":
    debug_service_data()