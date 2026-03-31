"""
API 키 관리 기능의 통합 테스트 (로그인 생략, 필요시 별도 설정)
"""
import pytest
import requests
from unittest.mock import patch, MagicMock
from flask import Flask

@pytest.fixture
def app():
    """Flask 애플리케이션 인스턴스 생성"""
    from msys_app import create_app
    app = create_app()
    app.config['TESTING'] = True
    return app

@pytest.fixture
def client(app):
    """테스트 클라이언트 생성"""
    return app.test_client()

def test_api_key_mngr_direct_endpoint(client):
    """API 키 관리 직접 호출 테스트 (인증 생략)"""
    print("\n=== API 키 관리 직접 호출 테스트 ===")
    
    # 인증이 필요한 경우 테스트 실패할 수 있음
    try:
        response = client.get('/api/api_key_mngr')
        print(f"API 응답 상태 코드: {response.status_code}")
        print(f"API 응답 내용: {response.data.decode('utf-8')}")
        
        if response.status_code == 200:
            data = response.get_json()
            print(f"✅ 성공적으로 데이터를 가져왔습니다.")
            if data['data']:
                print(f"   데이터 개수: {len(data['data'])}")
                print(f"   첫 번째 데이터: {data['data'][0]}")
        elif response.status_code == 401:
            print(f"⚠️ 인증이 필요한 엔드포인트입니다. 테스트를 위해 인증을 비활성화하거나 로그인을 추가하세요.")
        else:
            print(f"❌ API 호출에 실패했습니다. 상태 코드: {response.status_code}")
            
    except Exception as e:
        print(f"❌ 테스트 중 오류 발생: {e}")
        raise

def test_update_cd_endpoint(client):
    """CD 업데이트 엔드포인트 테스트"""
    print("\n=== CD 업데이트 엔드포인트 테스트 ===")
    
    try:
        response = client.post('/api/api_key_mngr/update_cd')
        print(f"API 응답 상태 코드: {response.status_code}")
        print(f"API 응답 내용: {response.data.decode('utf-8')}")
        
        if response.status_code == 200:
            data = response.get_json()
            print(f"✅ CD 업데이트 성공!")
            print(f"   추가된 CD 개수: {data.get('added_count', 0)}")
        elif response.status_code == 401:
            print(f"⚠️ 인증이 필요한 엔드포인트입니다.")
        else:
            print(f"❌ CD 업데이트 실패. 상태 코드: {response.status_code}")
            
    except Exception as e:
        print(f"❌ 테스트 중 오류 발생: {e}")
        raise

def test_expiry_info_endpoint(client):
    """유통기한 정보 조회 테스트"""
    print("\n=== 유통기한 정보 조회 테스트 ===")
    
    try:
        response = client.get('/api/api_key_mngr/expiry_info')
        print(f"API 응답 상태 코드: {response.status_code}")
        print(f"API 응답 내용: {response.data.decode('utf-8')}")
        
        if response.status_code == 200:
            data = response.get_json()
            print(f"✅ 유통기한 정보 조회 성공!")
            if data['data']:
                print(f"   조회된 데이터 수: {len(data['data'])}")
                for item in data['data']:
                    print(f"   - CD: {item['CD']}")
                    print(f"     시작일: {item['start_dt']}")
                    print(f"     유통기한: {item['due']}년")
                    print(f"     만료일: {item['expiry_date']}")
                    print(f"     남은 기간: {item['remaining_months']}개월")
                    print(f"     긴급 여부: {'⚠️ 1개월 이내' if item['is_urgent'] else '✅ 여유 있음'}")
        elif response.status_code == 401:
            print(f"⚠️ 인증이 필요한 엔드포인트입니다.")
        else:
            print(f"❌ 유통기한 정보 조회 실패. 상태 코드: {response.status_code}")
            
    except Exception as e:
        print(f"❌ 테스트 중 오류 발생: {e}")
        raise

def test_api_key_mngr_ui_route(client):
    """UI 라우트 테스트"""
    print("\n=== UI 라우트 테스트 ===")
    
    try:
        response = client.get('/api_key_mngr')
        print(f"UI 페이지 상태 코드: {response.status_code}")
        
        if response.status_code == 200:
            print(f"✅ UI 페이지가 정상적으로 로딩되었습니다.")
            print(f"   페이지 내용 (앞 200글자): {response.data.decode('utf-8')[:200]}...")
            assert "API 키 관리" in response.data.decode('utf-8')
        elif response.status_code == 302:
            print(f"⚠️ UI 페이지가 로그인 페이지로 리다이렉트됩니다. (인증 필요)")
        else:
            print(f"❌ UI 페이지 로딩 실패. 상태 코드: {response.status_code}")
            
    except Exception as e:
        print(f"❌ 테스트 중 오류 발생: {e}")
        raise

if __name__ == '__main__':
    print("API 키 관리 통합 테스트 시작")
    print("=" * 50)
    
    try:
        # Flask 테스트 클라이언트로 직접 테스트 실행
        from msys_app import create_app
        app = create_app()
        app.config['TESTING'] = True
        
        with app.test_client() as client:
            # 테스트 실행
            test_api_key_mngr_direct_endpoint(client)
            test_update_cd_endpoint(client)
            test_expiry_info_endpoint(client)
            test_api_key_mngr_ui_route(client)
            
        print("\n" + "=" * 50)
        print("✅ 테스트 실행 완료!")
        print("⚠️  주의: 일부 테스트는 인증으로 인해 실패할 수 있습니다.")
        print("   필요시 config.py에서 AUTH_ENABLED = False로 설정하세요.")
        
    except Exception as e:
        print(f"\n❌ 테스트 실행 중 오류: {e}")
        import traceback
        print(traceback.format_exc())