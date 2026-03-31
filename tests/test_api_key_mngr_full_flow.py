"""
API 키 관리 기능 전체 흐름 테스트
"""
import sys
import os

# 프로젝트 경로 설정
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

import logging
import pytest
from unittest.mock import MagicMock, patch
from service.api_key_mngr_service import ApiKeyMngrService
from dao.con_mst_dao import ConMstDAO
from dao.api_key_mngr_dao import ApiKeyMngrDao


class TestApiKeyMngrFullFlow:
    """API 키 관리 전체 흐름 테스트"""
    
    def setup_method(self):
        """테스트 전 초기화"""
        logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
        self.logger = logging.getLogger(__name__)
        
        self.logger.info("=" * 50)
        self.logger.info("API 키 관리 기능 전체 흐름 테스트")
        self.logger.info("=" * 50)
        
        # 서비스 인스턴스 생성
        self.service = ApiKeyMngrService()
        
        self.logger.info("✅ ApiKeyMngrService 인스턴스 생성 성공")
    
    @patch.object(ApiKeyMngrDao, 'select_cds_not_in_api_key_mngr')
    @patch.object(ApiKeyMngrDao, 'insert')
    @patch('service.api_key_mngr_service.get_db_connection')
    def test_update_cd_flow(self, mock_get_db, mock_insert, mock_select_cds):
        """CD 업데이트 전체 흐름 테스트"""
        self.logger.info("\n=== CD 업데이트 전체 흐름 테스트 ===")
        
        try:
            # 모의 연결 설정
            mock_conn = MagicMock()
            mock_get_db.return_value = mock_conn
            
            # 테스트할 CD 목록 설정
            mock_select_cds.return_value = [{'cd': 'CD316'}]
            self.logger.info("✅ TB_MNGR_SETT에 있는 CD 목록 모의 데이터 설정 완료")
            
            # ConMstDAO 모의 데이터
            mock_con_mst_data = {
                'cd': 'CD316',
                'cd_nm': '테스트 API 키',
                'update_dt': '2024-01-15',
                'item10': 'test@example.com'
            }
            
            with patch.object(ConMstDAO, 'get_mst_data_by_cd') as mock_get_mst:
                mock_get_mst.return_value = mock_con_mst_data
                
                # 메서드 호출
                added_count = self.service.update_cd_from_mngr_sett()
                
                self.logger.info(f"✅ update_cd_from_mngr_sett 메서드 호출 성공")
                self.logger.info(f"   추가된 CD 개수: {added_count}")
                
                assert added_count == 1, "CD가 추가되지 않았습니다."
                self.logger.info("✅ CD 추가 개수 검증 성공")
                
                # 삽입 메서드 호출 검증
                mock_insert.assert_called_once_with(
                    'CD316',
                    due=1,
                    start_dt='2024-01-15',
                    api_ownr_email_addr='test@example.com',
                    conn=mock_conn
                )
                self.logger.info("✅ ApiKeyMngrDao.insert 호출 파라미터 검증 성공")
                
                # 연결 및 트랜잭션 검증
                mock_get_db.assert_called()
                mock_conn.commit.assert_called_once()
                self.logger.info("✅ 트랜잭션 커밋 검증 성공")
                
        except Exception as e:
            self.logger.error(f"❌ 테스트 실패: {e}")
            import traceback
            self.logger.error(traceback.format_exc())
            raise
    
    @patch.object(ApiKeyMngrDao, 'select_cds_not_in_api_key_mngr')
    @patch.object(ApiKeyMngrDao, 'insert')
    @patch('service.api_key_mngr_service.get_db_connection')
    def test_update_cd_con_mst_not_found(self, mock_get_db, mock_insert, mock_select_cds):
        """TB_CON_MST에 CD가 존재하지 않는 경우 테스트"""
        self.logger.info("\n=== TB_CON_MST에 CD가 존재하지 않는 경우 테스트 ===")
        
        try:
            mock_conn = MagicMock()
            mock_get_db.return_value = mock_conn
            
            mock_select_cds.return_value = [{'cd': 'CD999'}]
            
            with patch.object(ConMstDAO, 'get_mst_data_by_cd') as mock_get_mst:
                mock_get_mst.return_value = None
                
                added_count = self.service.update_cd_from_mngr_sett()
                
                self.logger.info(f"✅ CD가 존재하지 않을 때 추가 개수: {added_count}")
                assert added_count == 0, "존재하지 않는 CD가 추가되어서는 안됩니다."
                
                mock_insert.assert_not_called()
                self.logger.info("✅ insert 메서드가 호출되지 않았습니다.")
                
        except Exception as e:
            self.logger.error(f"❌ 테스트 실패: {e}")
            import traceback
            self.logger.error(traceback.format_exc())
            raise
    
    @patch.object(ApiKeyMngrDao, 'select_all')
    def test_get_api_key_expiry_info_flow(self, mock_select_all):
        """API 키 유통기한 정보 조회 흐름 테스트"""
        self.logger.info("\n=== API 키 유통기한 정보 조회 흐름 테스트 ===")
        
        try:
            # 모의 데이터 설정
            mock_data = [
                {
                    'cd': 'API-001',
                    'start_dt': '2023-06-01',
                    'due': 1
                },
                {
                    'cd': 'API-002',
                    'start_dt': '2024-05-15',
                    'due': 2
                }
            ]
            
            mock_select_all.return_value = mock_data
            
            expiry_info = self.service.get_api_key_expiry_info()
            
            self.logger.info(f"✅ 유통기한 정보 조회 성공")
            self.logger.info(f"   반환된 항목 수: {len(expiry_info)}")
            
            assert len(expiry_info) == 2, "유통기한 정보가 정확히 반환되지 않았습니다."
            
            for item in expiry_info:
                self.logger.info(f"   CD: {item['cd']}")
                self.logger.info(f"      시작일: {item['start_dt']}")
                self.logger.info(f"      유통기한: {item['due']}년")
                self.logger.info(f"      만료일: {item['expiry_date']}")
                self.logger.info(f"      남은 기간: {item['remaining_months']}개월")
                self.logger.info(f"      긴급 여부: {'⚠️ 1개월 이내' if item['is_urgent'] else '✅ 여유 있음'}")
            
            self.logger.info("✅ 유통기한 정보 검증 완료")
            
        except Exception as e:
            self.logger.error(f"❌ 테스트 실패: {e}")
            import traceback
            self.logger.error(traceback.format_exc())
            raise


if __name__ == '__main__':
    test_obj = TestApiKeyMngrFullFlow()
    try:
        test_obj.setup_method()
        
        # 파이토쉘 실행
        import subprocess
        result = subprocess.run([
            sys.executable, '-m', 'pytest', 
            __file__, 
            '-v'
        ], capture_output=True, text=True, cwd=PROJECT_ROOT)
        
        print(result.stdout)
        if result.stderr:
            print(f"오류: {result.stderr}")
            
        if result.returncode == 0:
            print("\n✅ 모든 테스트가 성공적으로 완료되었습니다!")
        else:
            print("\n❌ 일부 테스트가 실패했습니다.")
            
    except Exception as e:
        print(f"❌ 테스트 실행 중 오류: {e}")
        import traceback
        print(traceback.format_exc())
        sys.exit(1)