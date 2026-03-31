import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

import sys
sys.path.append('.')
from msys_app import create_app
import json

def test_api_key_mngr_api():
    """API 키 관리 페이지 API 호출 테스트 (인증 포함)"""
    print("=== API 키 관리 페이지 API 호출 테스트 (인증 포함) ===")
    
    app = create_app()
    
    # 테스트 클라이언트 생성
    client = app.test_client()
    
    # 로그인 (테스트 사용자)
    login_data = {
        'user_id': 'admin',
        'user_pwd': 'password'
    }
    
    login_response = client.post('/api/auth/login', data=json.dumps(login_data), 
                                  content_type='application/json')
    
    print(f"로그인 상태 코드: {login_response.status_code}")
    if login_response.status_code == 200:
        login_result = login_response.get_json()
        print(f"로그인 성공: {login_result}")
        
        # 쿠키 추출
        cookies = login_response.headers.get('Set-Cookie', '')
        print(f"쿠키: {cookies}")
    else:
        print(f"로그인 오류: {login_response.get_data(as_text=True)}")
        return
    
    # API 키 관리 데이터 조회 API 테스트 (로그인 쿠키 포함)
    print("\n--- 1. API 키 관리 데이터 조회 API ---")
    response = client.get('/api/api_key_mngr', headers={'Cookie': cookies})
    
    print(f"   상태 코드: {response.status_code}")
    if response.status_code == 200:
        data = response.get_json()
        print(f"   성공: {len(data)}개의 데이터 반환")
        if data:
            print(f"   첫 번째 데이터: {json.dumps(data[0], indent=2, default=str)}")
    else:
        print(f"   오류: {response.get_data(as_text=True)}")
    
    # 유통기한 정보 조회 API 테스트 (로그인 쿠키 포함)
    print("\n--- 2. 유통기한 정보 조회 API ---")
    response = client.get('/api/api_key_mngr/expiry_info', headers={'Cookie': cookies})
    
    print(f"   상태 코드: {response.status_code}")
    if response.status_code == 200:
        data = response.get_json()
        print(f"   성공: {len(data)}개의 데이터 반환")
        if data:
            print(f"   첫 번째 데이터: {json.dumps(data[0], indent=2, default=str)}")
    else:
        print(f"   오류: {response.get_data(as_text=True)}")
    
    # CD 업데이트 API 테스트 (POST, 로그인 쿠키 포함)
    print("\n--- 3. CD 업데이트 API ---")
    response = client.post('/api/api_key_mngr/update_cds', headers={'Cookie': cookies})
    
    print(f"   상태 코드: {response.status_code}")
    if response.status_code == 200:
        data = response.get_json()
        print(f"   성공: {data}")
    else:
        print(f"   오류: {response.get_data(as_text=True)}")

if __name__ == "__main__":
    test_api_key_mngr_api()