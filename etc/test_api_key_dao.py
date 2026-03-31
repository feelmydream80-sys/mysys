import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

import sys
sys.path.append('.')
from msys_app import create_app

def test_api_key_dao():
    print("=== API 키 관리 DAO 테스트 ===")
    
    try:
        app = create_app()
        
        with app.app_context():
            from dao.api_key_mngr_dao import ApiKeyMngrDao
            
            # DAO 메서드 테스트
            print("\n=== DAO select_all() ===")
            dao = ApiKeyMngrDao()
            data = dao.select_all()
            print(f"개수: {len(data)}")
            for item in data:
                print(item)
                
    except Exception as e:
        print(f"\n오류 발생: {e}")
        import traceback
        print("\n상세 오류 스택:")
        print(traceback.format_exc())

if __name__ == "__main__":
    test_api_key_dao()