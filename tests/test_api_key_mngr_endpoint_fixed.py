"""
API 키 관리 기능의 통합 테스트 - 웹 페이지까지의 데이터 전달 확인 (수정 버전)
"""
import sys
import os

# 프로젝트 경로 설정
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

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

def test_get_all_api_key_mngr(client):
    """API 키 관리 데이터 조회 테스트"""
    print("\n=== API 키 관리 데이터 조회 테스트 ===")
    
    try:
        # 로그인 (사전 필요한 경우)
        login_response = client.post('/auth/login', data={
            'user_id': 'admin',
            'password': 'admin'
        })
        print(f"로그인 상태 코드: {login_response.status_code}")
        
        # API 키 관리 데이터 조회
        response = client.get('/api/api_key_mngr')
        print(f"API 응답 상태 코드: {response.status_code}")
        print(f"API 응답 내용: {response.data.decode('utf-8')}")
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] == True
        
        if data['data']:
            print(f"조회된 데이터 수: {len(data['data'])}")
            print(f"첫 번째 데이터 예시: {data['data'][0]}")
        else:
            print(f"조회된 데이터가 없습니다.")
            
    except Exception as e:
        print(f"테스트 중 오류 발생: {e}")
        raise

def test_update_cd_from_mngr_sett(client):
    """CD 업데이트 기능 테스트"""
    print("\n=== CD 업데이트 기능 테스트 ===")
    
    try:
        # 로그인 (사전 필요한 경우)
        login_response = client.post('/auth/login', data={
            'user_id': 'admin',
            'password': 'admin'
        })
        print(f"로그인 상태 코드: {login_response.status_code}")
        
        # CD 업데이트 요청
        response = client.post('/api/api_key_mngr/update_cd')
        print(f"API 응답 상태 코드: {response.status_code}")
        print(f"API 응답 내용: {response.data.decode('utf-8')}")
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] == True
        print(f"CD 업데이트 완료. 추가된 CD 수: {data.get('added_count', 0)}")
        
    except Exception as e:
        print(f"테스트 중 오류 발생: {e}")
        raise

def test_get_api_key_expiry_info(client):
    """API 키 유통기한 정보 조회 테스트"""
    print("\n=== API 키 유통기한 정보 조회 테스트 ===")
    
    try:
        # 로그인 (사전 필요한 경우)
        login_response = client.post('/auth/login', data={
            'user_id': 'admin',
            'password': 'admin'
        })
        print(f"로그인 상태 코드: {login_response.status_code}")
        
        # 유통기한 정보 조회
        response = client.get('/api/api_key_mngr/expiry_info')
        print(f"API 응답 상태 코드: {response.status_code}")
        print(f"API 응답 내용: {response.data.decode('utf-8')}")
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] == True
        
        if data['data']:
            print(f"조회된 데이터 수: {len(data['data'])}")
            # 유통기한 정보 확인
            for item in data['data']:
                print(f"   - CD: {item['CD']}")
                print(f"     시작일: {item['start_dt']}")
                print(f"     유통기한: {item['due']}년")
                print(f"     만료일: {item['expiry_date']}")
                print(f"     남은 기간: {item['remaining_months']}개월")
                print(f"     긴급 여부: {'1개월 이내' if item['is_urgent'] else '여유 있음'}")
        else:
            print(f"조회된 데이터가 없습니다.")
            
    except Exception as e:
        print(f"테스트 중 오류 발생: {e}")
        raise

def test_api_key_mngr_ui_page(client):
    """UI 페이지 로딩 테스트"""
    print("\n=== UI 페이지 로딩 테스트 ===")
    
    try:
        # 로그인 (사전 필요한 경우)
        login_response = client.post('/auth/login', data={
            'user_id': 'admin',
            'password': 'admin'
        })
        print(f"로그인 상태 코드: {login_response.status_code}")
        
        # UI 페이지 요청
        response = client.get('/api_key_mngr')
        print(f"페이지 응답 상태 코드: {response.status_code}")
        print(f"페이지 내용: {response.data.decode('utf-8')[:200]}...")
        
        assert response.status_code == 200
        assert "API 키 관리" in response.data.decode('utf-8')
        print("UI 페이지가 정상적으로 로딩되었습니다.")
        
    except Exception as e:
        print(f"테스트 중 오류 발생: {e}")
        raise

if __name__ == '__main__':
    print("API 키 관리 기능 통합 테스트 시작")
    print("=" * 50)
    
    try:
        # Flask 테스트 클라이언트로 직접 테스트 실행
        from msys_app import create_app
        app = create_app()
        app.config['TESTING'] = True
        
        with app.test_client() as client:
            # 테스트 실행
            test_get_all_api_key_mngr(client)
            test_update_cd_from_mngr_sett(client)
            test_get_api_key_expiry_info(client)
            test_api_key_mngr_ui_page(client)
            
        print("\n" + "=" * 50)
        print("모든 테스트가 성공적으로 완료되었습니다!")
        
    except Exception as e:
        print(f"\n테스트 실행 중 오류: {e}")
        import traceback
        print(traceback.format_exc())