import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

import sys
sys.path.append('.')
from msys_app import create_app

def check_real_api_key_data():
    print("=== 실제 DB API 키 관리 데이터 조회 ===")
    
    try:
        app = create_app()
        
        with app.app_context():
            from dao.api_key_mngr_dao import ApiKeyMngrDao
            dao = ApiKeyMngrDao()
            data = dao.select_all()
            
            print(f"DAO select_all 개수: {len(data)}")
            
            if data:
                print("\n=== DB에서 조회된 실제 데이터 ===")
                for item in data:
                    print(item)
                
                print("\n=== 데이터 필드 정보 ===")
                if len(data) > 0:
                    first_item = data[0]
                    print("필드명:", list(first_item.keys()))
            else:
                print("DAO에서 데이터를 가져오지 못했습니다.")
                
            print("\n=== 유통기한 정보 조회 ===")
            from service.api_key_mngr_service import ApiKeyMngrService
            service = ApiKeyMngrService()
            expiry_info = service.get_api_key_expiry_info()
            print(f"expiry_info 개수: {len(expiry_info)}")
            
            if expiry_info:
                print("\n=== 유통기한 정보 상세 ===")
                for info in expiry_info:
                    print(info)
                
    except Exception as e:
        print(f"\n오류 발생: {e}")
        import traceback
        print("\n상세 오류 스택:")
        print(traceback.format_exc())

if __name__ == "__main__":
    check_real_api_key_data()