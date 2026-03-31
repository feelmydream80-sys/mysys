import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

import sys
sys.path.append('.')
from msys_app import create_app
import json

def test_api_key_mngr_api():
    """API 키 관리 페이지 API 호출 테스트"""
    print("=== API 키 관리 페이지 API 호출 테스트 ===")
    
    app = create_app()
    
    # 테스트 클라이언트 생성
    client = app.test_client()
    
    # API 키 관리 데이터 조회 API 테스트
    print("\n--- 1. API 키 관리 데이터 조회 API ---")
    response = client.get('/api/api_key_mngr')
    
    print(f"   상태 코드: {response.status_code}")
    if response.status_code == 200:
        data = response.get_json()
        print(f"   성공: {len(data)}개의 데이터 반환")
        if data:
            print(f"   첫 번째 데이터: {json.dumps(data[0], indent=2, default=str)}")
    else:
        print(f"   오류: {response.get_data(as_text=True)}")
    
    # 유통기한 정보 조회 API 테스트
    print("\n--- 2. 유통기한 정보 조회 API ---")
    response = client.get('/api/api_key_mngr/expiry_info')
    
    print(f"   상태 코드: {response.status_code}")
    if response.status_code == 200:
        data = response.get_json()
        print(f"   성공: {len(data)}개의 데이터 반환")
        if data:
            print(f"   첫 번째 데이터: {json.dumps(data[0], indent=2, default=str)}")
    else:
        print(f"   오류: {response.get_data(as_text=True)}")
    
    # CD 업데이트 API 테스트 (POST)
    print("\n--- 3. CD 업데이트 API ---")
    response = client.post('/api/api_key_mngr/update_cds')
    
    print(f"   상태 코드: {response.status_code}")
    if response.status_code == 200:
        data = response.get_json()
        print(f"   성공: {data}")
    else:
        print(f"   오류: {response.get_data(as_text=True)}")

if __name__ == "__main__":
    test_api_key_mngr_api()