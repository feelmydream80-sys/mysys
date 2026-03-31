import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from service.api_key_mngr_service import ApiKeyMngrService

def debug_api_key_data():
    print("=== Debug API Key Data ===")
    
    try:
        service = ApiKeyMngrService()
        
        print("\n1. 모든 API 키 관리 정보 조회 (select_all):")
        all_data = service.get_all_api_key_mngr()
        print(f"반환된 데이터 개수: {len(all_data)}")
        
        if all_data:
            for item in all_data:
                print(f"  CD: {item.get('cd')}")
                print(f"  DUE: {item.get('due')}")
                print(f"  START_DT: {item.get('start_dt')}")
                print(f"  API OWNER: {item.get('api_ownr_email_addr')}")
                print("-" * 30)
        
        print("\n2. API 키 유통기한 정보 조회 (get_api_key_expiry_info):")
        expiry_info = service.get_api_key_expiry_info()
        print(f"반환된 데이터 개수: {len(expiry_info)}")
        
        if expiry_info:
            for item in expiry_info:
                print(f"  CD: {item.get('cd')}")
                print(f"  START_DT: {item.get('start_dt')}")
                print(f"  DUE: {item.get('due')}")
                print(f"  EXPIRY_DATE: {item.get('expiry_date')}")
                print(f"  REMAINING_DAYS: {item.get('remaining_days')}")
                print(f"  IS_URGENT: {item.get('is_urgent')}")
                print("-" * 30)
        
    except Exception as e:
        print(f"\n오류 발생: {e}")
        import traceback
        print("\n상세 오류 스택:")
        print(traceback.format_exc())

if __name__ == "__main__":
    debug_api_key_data()