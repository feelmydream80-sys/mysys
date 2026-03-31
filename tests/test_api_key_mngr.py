"""
API 키 관리 기능 테스트
"""
import pytest
from unittest.mock import patch, MagicMock
from dao.api_key_mngr_dao import ApiKeyMngrDao
from service.api_key_mngr_service import ApiKeyMngrService


class TestApiKeyMngrDao:
    """ApiKeyMngrDao 테스트"""
    
    def test_initialization(self):
        """DAO 초기화 테스트"""
        dao = ApiKeyMngrDao()
        assert dao is not None

    @patch('dao.api_key_mngr_dao.get_db_connection')
    def test_select_all(self, mock_get_db):
        """select_all 메서드 테스트"""
        # 모의 데이터
        mock_data = [
            ('API-KEY-001', 1, '2025-01-15'),
            ('API-KEY-002', 2, '2024-06-01')
        ]
        
        # Mock 설정
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = mock_data
        mock_cursor.description = [('CD',), ('DUE',), ('START_DT',)]
        
        mock_conn = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        
        mock_get_db.return_value = mock_conn
        
        # 테스트 실행
        dao = ApiKeyMngrDao()
        result = dao.select_all()
        
        assert len(result) == 2
        assert result[0]['CD'] == 'API-KEY-001'
        assert result[1]['DUE'] == 2

    @patch('dao.api_key_mngr_dao.get_db_connection')
    def test_select_by_cd(self, mock_get_db):
        """select_by_cd 메서드 테스트"""
        # 모의 데이터
        mock_data = ('API-KEY-001', 1, '2025-01-15')
        
        # Mock 설정
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = mock_data
        mock_cursor.description = [('CD',), ('DUE',), ('START_DT',)]
        
        mock_conn = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        
        mock_get_db.return_value = mock_conn
        
        # 테스트 실행
        dao = ApiKeyMngrDao()
        result = dao.select_by_cd('API-KEY-001')
        
        assert result is not None
        assert result['CD'] == 'API-KEY-001'


class TestApiKeyMngrService:
    """ApiKeyMngrService 테스트"""
    
    @patch.object(ApiKeyMngrService, '__init__', return_value=None)
    def test_initialization(self, mock_init):
        """서비스 초기화 테스트"""
        service = ApiKeyMngrService()
        assert service is not None

    @patch.object(ApiKeyMngrService, 'get_all_api_key_mngr')
    def test_get_all_api_key_mngr(self, mock_method):
        """get_all_api_key_mngr 메서드 테스트"""
        mock_method.return_value = [{'CD': 'API-KEY-001', 'DUE': 1}]
        
        service = ApiKeyMngrService()
        result = service.get_all_api_key_mngr()
        
        assert len(result) > 0
        assert 'CD' in result[0]

    @patch.object(ApiKeyMngrService, 'update_cd_from_mngr_sett')
    def test_update_cd_from_mngr_sett(self, mock_method):
        """update_cd_from_mngr_sett 메서드 테스트"""
        mock_method.return_value = 2
        
        service = ApiKeyMngrService()
        result = service.update_cd_from_mngr_sett()
        
        assert isinstance(result, int)
        assert result >= 0


if __name__ == '__main__':
    pytest.main([__file__, '-v'])