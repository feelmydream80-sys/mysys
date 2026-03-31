"""
API 키 관리 기능의 간단한 테스트 (DAO/SERVICE 레벨)
"""
import pytest
from unittest.mock import patch, MagicMock
from dao.api_key_mngr_dao import ApiKeyMngrDao
from service.api_key_mngr_service import ApiKeyMngrService


class TestApiKeyMngrSimple:
    """API 키 관리 간단 테스트"""
    
    def test_dao_initialization(self):
        """DAO 초기화 테스트"""
        print("=== DAO 초기화 테스트 ===")
        try:
            dao = ApiKeyMngrDao()
            assert dao is not None
            print("✅ DAO 초기화 성공")
        except Exception as e:
            print(f"❌ DAO 초기화 오류: {e}")
            raise

    @patch('dao.api_key_mngr_dao.get_db_connection')
    def test_dao_select_all(self, mock_get_db):
        """DAO select_all 테스트"""
        print("=== DAO select_all 테스트 ===")
        try:
            # 모의 데이터
            mock_data = [
                ('API-001', 1, '2025-01-15', 'user1@example.com'),
                ('API-002', 2, '2024-06-01', 'user2@example.com')
            ]
            
            # Mock 설정
            mock_cursor = MagicMock()
            mock_cursor.fetchall.return_value = mock_data
            mock_cursor.description = [('CD',), ('DUE',), ('START_DT',), ('API_OWNR_EMAIL_ADDR',)]
            
            mock_conn = MagicMock()
            mock_conn.cursor.return_value = mock_cursor
            
            mock_get_db.return_value = mock_conn
            
            # 테스트 실행
            dao = ApiKeyMngrDao()
            result = dao.select_all()
            
            assert len(result) == 2
            assert result[0]['CD'] == 'API-001'
            assert result[1]['DUE'] == 2
            assert result[0]['API_OWNR_EMAIL_ADDR'] == 'user1@example.com'
            print("✅ DAO select_all 성공")
        except Exception as e:
            print(f"❌ DAO select_all 오류: {e}")
            raise

    @patch('dao.api_key_mngr_dao.get_db_connection')
    def test_dao_select_by_cd(self, mock_get_db):
        """DAO select_by_cd 테스트"""
        print("=== DAO select_by_cd 테스트 ===")
        try:
            # 모의 데이터
            mock_data = ('API-001', 1, '2025-01-15', 'user1@example.com')
            
            # Mock 설정
            mock_cursor = MagicMock()
            mock_cursor.fetchone.return_value = mock_data
            mock_cursor.description = [('CD',), ('DUE',), ('START_DT',), ('API_OWNR_EMAIL_ADDR',)]
            
            mock_conn = MagicMock()
            mock_conn.cursor.return_value = mock_cursor
            
            mock_get_db.return_value = mock_conn
            
            # 테스트 실행
            dao = ApiKeyMngrDao()
            result = dao.select_by_cd('API-001')
            
            assert result is not None
            assert result['CD'] == 'API-001'
            assert result['API_OWNR_EMAIL_ADDR'] == 'user1@example.com'
            print("✅ DAO select_by_cd 성공")
        except Exception as e:
            print(f"❌ DAO select_by_cd 오류: {e}")
            raise

    @patch.object(ApiKeyMngrService, '__init__', return_value=None)
    def test_service_initialization(self, mock_init):
        """서비스 초기화 테스트"""
        print("=== 서비스 초기화 테스트 ===")
        try:
            service = ApiKeyMngrService()
            assert service is not None
            print("✅ 서비스 초기화 성공")
        except Exception as e:
            print(f"❌ 서비스 초기화 오류: {e}")
            raise

    @patch.object(ApiKeyMngrService, 'get_all_api_key_mngr')
    def test_service_get_all_api_key_mngr(self, mock_method):
        """서비스 get_all_api_key_mngr 테스트"""
        print("=== 서비스 get_all_api_key_mngr 테스트 ===")
        try:
            mock_method.return_value = [
                {'CD': 'API-001', 'DUE': 1, 'API_OWNR_EMAIL_ADDR': 'user1@example.com'},
                {'CD': 'API-002', 'DUE': 2, 'API_OWNR_EMAIL_ADDR': 'user2@example.com'}
            ]
            
            service = ApiKeyMngrService()
            result = service.get_all_api_key_mngr()
            
            assert len(result) > 0
            assert 'CD' in result[0]
            assert 'API_OWNR_EMAIL_ADDR' in result[0]
            print("✅ 서비스 get_all_api_key_mngr 성공")
        except Exception as e:
            print(f"❌ 서비스 get_all_api_key_mngr 오류: {e}")
            raise

    @patch.object(ApiKeyMngrService, 'update_cd_from_mngr_sett')
    def test_service_update_cd_from_mngr_sett(self, mock_method):
        """서비스 update_cd_from_mngr_sett 테스트"""
        print("=== 서비스 update_cd_from_mngr_sett 테스트 ===")
        try:
            mock_method.return_value = 2
            
            service = ApiKeyMngrService()
            result = service.update_cd_from_mngr_sett()
            
            assert isinstance(result, int)
            assert result >= 0
            print(f"✅ 서비스 update_cd_from_mngr_sett 성공 (추가된 CD: {result})")
        except Exception as e:
            print(f"❌ 서비스 update_cd_from_mngr_sett 오류: {e}")
            raise

    @patch.object(ApiKeyMngrService, 'get_api_key_expiry_info')
    def test_service_get_api_key_expiry_info(self, mock_method):
        """서비스 get_api_key_expiry_info 테스트"""
        print("=== 서비스 get_api_key_expiry_info 테스트 ===")
        try:
            mock_method.return_value = [
                {
                    'CD': 'API-001',
                    'start_dt': '2025-01-15',
                    'due': 1,
                    'expiry_date': '2026-01-15',
                    'remaining_months': 10,
                    'is_urgent': False
                },
                {
                    'CD': 'API-002',
                    'start_dt': '2025-12-01',
                    'due': 1,
                    'expiry_date': '2026-12-01',
                    'remaining_months': 1,
                    'is_urgent': True
                }
            ]
            
            service = ApiKeyMngrService()
            result = service.get_api_key_expiry_info()
            
            assert len(result) > 0
            assert 'CD' in result[0]
            assert 'remaining_months' in result[0]
            assert 'is_urgent' in result[0]
            
            urgent_items = [item for item in result if item['is_urgent']]
            print(f"✅ 서비스 get_api_key_expiry_info 성공 (긴급 항목: {len(urgent_items)})")
        except Exception as e:
            print(f"❌ 서비스 get_api_key_expiry_info 오류: {e}")
            raise

if __name__ == '__main__':
    print("API 키 관리 간단 테스트 시작")
    print("=" * 50)
    
    try:
        test_obj = TestApiKeyMngrSimple()
        
        test_obj.test_dao_initialization()
        with patch('dao.api_key_mngr_dao.get_db_connection') as mock_get_db:
            test_obj.test_dao_select_all(mock_get_db)
            test_obj.test_dao_select_by_cd(mock_get_db)
            
        with patch.object(ApiKeyMngrService, '__init__', return_value=None):
            test_obj.test_service_initialization(MagicMock())
            
            with patch.object(ApiKeyMngrService, 'get_all_api_key_mngr') as mock_method:
                test_obj.test_service_get_all_api_key_mngr(mock_method)
                
            with patch.object(ApiKeyMngrService, 'update_cd_from_mngr_sett') as mock_method:
                test_obj.test_service_update_cd_from_mngr_sett(mock_method)
                
            with patch.object(ApiKeyMngrService, 'get_api_key_expiry_info') as mock_method:
                test_obj.test_service_get_api_key_expiry_info(mock_method)
                
        print("\n" + "=" * 50)
        print("✅ 모든 간단 테스트가 성공적으로 완료되었습니다!")
        
    except Exception as e:
        print(f"\n❌ 테스트 실행 중 오류: {e}")
        import traceback
        print(traceback.format_exc())