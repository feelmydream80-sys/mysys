"""
API 키 관리 기능의 직접 API 호출 테스트
"""
import sys
import os
import requests
from bs4 import BeautifulSoup

# 프로젝트 경로 설정
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def main():
    """메인 테스트 함수"""
    base_url = "http://127.0.0.1:18080"
    session = requests.Session()
    
    print("=" * 50)
    print("API 키 관리 기능 직접 API 테스트")
    print("=" * 50)
    
    try:
        print("\n1. API 키 관리 데이터 조회 테스트")
        print("-" * 30)
        response = session.get(f"{base_url}/api/api_key_mngr")
        print(f"응답 상태 코드: {response.status_code}")
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"API 성공 여부: {data['success']}")
                if data['success'] and data['data']:
                    print(f"조회된 데이터 수: {len(data['data'])}")
                    print(f"첫 번째 데이터 예시: {data['data'][0]}")
                else:
                    print("데이터가 없습니다.")
            except Exception as e:
                print(f"JSON 파싱 오류: {e}")
                print(f"응답 내용: {response.text}")
        else:
            print(f"오류 응답 내용: {response.text}")
            
        print("\n2. CD 업데이트 기능 테스트")
        print("-" * 30)
        response = session.post(f"{base_url}/api/api_key_mngr/update_cd")
        print(f"응답 상태 코드: {response.status_code}")
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"API 성공 여부: {data['success']}")
                if data['success']:
                    print(f"메시지: {data['message']}")
                    print(f"추가된 CD 수: {data.get('added_count', 0)}")
                else:
                    print(f"오류 메시지: {data['message']}")
            except Exception as e:
                print(f"JSON 파싱 오류: {e}")
                print(f"응답 내용: {response.text}")
        else:
            print(f"오류 응답 내용: {response.text}")
            
        print("\n3. API 키 유통기한 정보 조회 테스트")
        print("-" * 30)
        response = session.get(f"{base_url}/api/api_key_mngr/expiry_info")
        print(f"응답 상태 코드: {response.status_code}")
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"API 성공 여부: {data['success']}")
                if data['success'] and data['data']:
                    print(f"조회된 데이터 수: {len(data['data'])}")
                    for item in data['data']:
                        print(f"   - CD: {item['CD']}")
                        print(f"     시작일: {item['start_dt']}")
                        print(f"     유통기한: {item['due']}년")
                        print(f"     만료일: {item['expiry_date']}")
                        print(f"     남은 기간: {item['remaining_months']}개월")
                        print(f"     긴급 여부: {'1개월 이내' if item['is_urgent'] else '여유 있음'}")
                else:
                    print("데이터가 없습니다.")
            except Exception as e:
                print(f"JSON 파싱 오류: {e}")
                print(f"응답 내용: {response.text}")
        else:
            print(f"오류 응답 내용: {response.text}")
            
        print("\n4. UI 페이지 접근 테스트")
        print("-" * 30)
        response = session.get(f"{base_url}/api_key_mngr")
        print(f"응답 상태 코드: {response.status_code}")
        
        if response.status_code == 302:
            print("로그인이 필요합니다. 로그인 페이지로 리다이렉트됨")
            login_url = response.headers.get('Location', '/login')
            print(f"리다이렉트 URL: {login_url}")
            
            # 로그인 페이지 내용 확인
            login_response = session.get(f"{base_url}{login_url}")
            print(f"로그인 페이지 상태 코드: {login_response.status_code}")
            if login_response.status_code == 200:
                print("로그인 페이지에 정상적으로 접근할 수 있습니다.")
                # 로그인 폼 찾기 (간단한 체크)
                soup = BeautifulSoup(login_response.text, 'html.parser')
                if soup.find('form'):
                    print("로그인 폼이 존재합니다.")
        elif response.status_code == 200:
            print("UI 페이지가 정상적으로 로드되었습니다.")
            soup = BeautifulSoup(response.text, 'html.parser')
            if "API 키 관리" in soup.title.text or "API 키 관리" in response.text:
                print("API 키 관리 페이지 내용이 확인됩니다.")
        else:
            print(f"오류 응답 내용: {response.text}")
            
        print("\n" + "=" * 50)
        print("API 테스트가 완료되었습니다!")
        
    except Exception as e:
        print(f"\n에러 발생: {e}")
        import traceback
        print(traceback.format_exc())


if __name__ == "__main__":
    main()