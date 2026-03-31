"""
단순한 인증된 API 키 관리 기능 테스트
"""
import sys
import os
import requests

# 프로젝트 경로 설정
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def main():
    """메인 테스트 함수"""
    base_url = "http://127.0.0.1:18080"
    session = requests.Session()
    
    print("=" * 50)
    print("단순한 인증된 API 키 관리 기능 테스트")
    print("=" * 50)
    
    try:
        print("\n1. 로그인 테스트")
        print("-" * 30)
        
        login_data = {
            'user_id': 'admin',
            'password': 'admin'
        }
        
        login_response = session.post(f"{base_url}/auth/login", data=login_data)
        
        if login_response.status_code == 302:
            print("로그인 성공! 리다이렉트됨")
            print(f"리다이렉트 URL: {login_response.headers.get('Location')}")
        else:
            print("로그인 실패")
            print(f"상태 코드: {login_response.status_code}")
            return
            
        print("\n2. API 키 관리 데이터 조회")
        print("-" * 30)
        response = session.get(f"{base_url}/api/api_key_mngr")
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"성공 여부: {data['success']}")
                if data['success']:
                    print(f"데이터 수: {len(data['data'])}")
            except Exception as e:
                print(f"JSON 파싱 오류: {e}")
                print(response.text)
        else:
            print(f"오류: {response.status_code}")
            print(response.text)
            
        print("\n3. CD 업데이트 테스트")
        print("-" * 30)
        response = session.post(f"{base_url}/api/api_key_mngr/update_cd")
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"성공 여부: {data['success']}")
                if data['success']:
                    print(f"메시지: {data['message']}")
                    print(f"추가된 CD 수: {data.get('added_count', 0)}")
            except Exception as e:
                print(f"JSON 파싱 오류: {e}")
                print(response.text)
        else:
            print(f"오류: {response.status_code}")
            print(response.text)
            
        print("\n4. 유통기한 정보 조회")
        print("-" * 30)
        response = session.get(f"{base_url}/api/api_key_mngr/expiry_info")
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"성공 여부: {data['success']}")
                if data['success']:
                    print(f"데이터 수: {len(data['data'])}")
            except Exception as e:
                print(f"JSON 파싱 오류: {e}")
                print(response.text)
        else:
            print(f"오류: {response.status_code}")
            print(response.text)
            
        print("\n5. UI 페이지 접근")
        print("-" * 30)
        response = session.get(f"{base_url}/api_key_mngr")
        if response.status_code == 200:
            print("UI 페이지 접근 성공")
            print(f"응답 길이: {len(response.text)} bytes")
        else:
            print(f"오류: {response.status_code}")
            print(response.text)
            
        print("\n" + "=" * 50)
        print("테스트 완료!")
        
    except Exception as e:
        print(f"\n에러: {e}")
        import traceback
        print(traceback.format_exc())


if __name__ == "__main__":
    main()