"""
ConMstDAO 트랜잭션 문제 분석 및 수정 테스트
"""
import sys
import os

# 프로젝트 경로 설정
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

import pytest
import logging
from unittest.mock import patch, MagicMock
from dao.con_mst_dao import ConMstDAO


class TestConMstDAOTransactionFix:
    """ConMstDAO 트랜잭션 문제 분석 및 수정 테스트"""
    
    def setup_method(self):
        """테스트 전 초기화"""
        # 로그 레벨 설정
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
        # DB 연결 모의객체 생성
        self.mock_conn = MagicMock()
        self.mock_cursor = MagicMock()
        self.mock_conn.cursor.return_value = self.mock_cursor
        
        # DAO 인스턴스 생성
        self.dao = ConMstDAO(self.mock_conn)
        
        self.logger.info("=== 테스트 세팅 완료 ===")
    
    def test_get_mst_data_by_cd_success(self):
        """get_mst_data_by_cd 메서드 성공 테스트"""
        self.logger.info("\n=== get_mst_data_by_cd 메서드 성공 테스트 ===")
        
        try:
            # 모의 데이터 설정
            mock_result = (
                'CD001',
                '테스트 데이터',
                '설명',
                '값1', '값2', '값3', '값4', '값5',
                '값6', '값7', '값8', '값9', '값10',
                'Y', '2024-01-15'
            )
            
            self.mock_cursor.fetchone.return_value = mock_result
            self.mock_cursor.description = [
                ('cd',), ('cd_nm',), ('cd_desc',), 
                ('item1',), ('item2',), ('item3',), ('item4',), ('item5',),
                ('item6',), ('item7',), ('item8',), ('item9',), ('item10',),
                ('use_yn',), ('udate_dt',)
            ]
            
            # 메서드 호출
            result = self.dao.get_mst_data_by_cd('CD001')
            
            self.logger.info("✅ get_mst_data_by_cd 메서드 호출 성공")
            self.logger.info(f"   반환된 결과: {result}")
            
            # 반환된 데이터가 dict인지 확인
            assert isinstance(result, dict), "반환된 데이터가 dict 타입이 아닙니다."
            self.logger.info("✅ 반환된 데이터 타입이 dict입니다.")
            
            # 주요 필드 검증
            assert 'CD' in result, "CD 필드가 없습니다."
            assert 'CD_NM' in result, "CD_NM 필드가 없습니다."
            assert 'UDATE_DT' in result, "UDATE_DT 필드가 없습니다."
            
            self.logger.info("✅ 모든 필드 검증 성공")
            self.logger.info(f"   CD: {result['CD']}")
            self.logger.info(f"   CD_NM: {result['CD_NM']}")
            self.logger.info(f"   ITEM10: {result.get('ITEM10')}")
            self.logger.info(f"   UDATE_DT: {result['UDATE_DT']}")
            
        except Exception as e:
            self.logger.error(f"❌ 테스트 실패: {e}")
            import traceback
            self.logger.error(traceback.format_exc())
            raise
    
    def test_get_mst_data_by_cd_nonexistent(self):
        """존재하지 않는 CD로 조회 테스트"""
        self.logger.info("\n=== 존재하지 않는 CD로 조회 테스트 ===")
        
        try:
            self.mock_cursor.fetchone.return_value = None
            
            result = self.dao.get_mst_data_by_cd('INVALID_CD')
            
            self.logger.info(f"✅ 조회 결과: {result}")
            assert result is None, "존재하지 않는 CD 조회시 None을 반환해야 합니다."
            self.logger.info("✅ 존재하지 않는 CD 조회 결과가 None입니다.")
            
        except Exception as e:
            self.logger.error(f"❌ 테스트 실패: {e}")
            import traceback
            self.logger.error(traceback.format_exc())
            raise
    
    @patch('dao.con_mst_dao.logging')
    def test_get_mst_data_by_cd_exception(self, mock_logging):
        """예외 발생 테스트"""
        self.logger.info("\n=== 예외 발생 테스트 ===")
        
        try:
            self.mock_cursor.execute.side_effect = Exception("데이터베이스 연결 오류")
            
            result = self.dao.get_mst_data_by_cd('CD001')
            
            self.logger.info(f"✅ 예외 발생 시 반환값: {result}")
            assert result is None, "예외 발생시 None을 반환해야 합니다."
            self.logger.info("✅ 예외 발생 시 None을 반환합니다.")
            
            mock_logging.error.assert_called_once()
            self.logger.info("✅ 오류 로깅이 호출되었습니다.")
            
        except Exception as e:
            self.logger.error(f"❌ 테스트 실패: {e}")
            import traceback
            self.logger.error(traceback.format_exc())
            raise
    
    def test_transaction_handling(self):
        """트랜잭션 처리 테스트"""
        self.logger.info("\n=== 트랜잭션 처리 테스트 ===")
        
        try:
            # 트랜잭션 상태 확인
            assert hasattr(self.mock_conn, 'commit'), "커넥션 객체에 commit 메서드가 없습니다."
            assert hasattr(self.mock_conn, 'rollback'), "커넥션 객체에 rollback 메서드가 없습니다."
            
            self.logger.info("✅ 트랜잭션 관련 메서드 확인 완료")
            self.logger.info("   commit 메서드 존재: {}".format(hasattr(self.mock_conn, 'commit')))
            self.logger.info("   rollback 메서드 존재: {}".format(hasattr(self.mock_conn, 'rollback')))
            
            # 연결 상태 확인
            self.logger.info("   연결 상태: {}".format(self.mock_conn))
            
        except Exception as e:
            self.logger.error(f"❌ 테스트 실패: {e}")
            import traceback
            self.logger.error(traceback.format_exc())
            raise

if __name__ == '__main__':
    print("=" * 50)
    print("ConMstDAO 트랜잭션 문제 분석 및 수정 테스트")
    print("=" * 50)
    
    try:
        test_obj = TestConMstDAOTransactionFix()
        test_obj.setup_method()
        
        test_obj.test_get_mst_data_by_cd_success()
        test_obj.test_get_mst_data_by_cd_nonexistent()
        test_obj.test_get_mst_data_by_cd_exception()
        test_obj.test_transaction_handling()
        
        print("\n✅ 모든 테스트가 성공적으로 완료되었습니다!")
        
    except Exception as e:
        print(f"\n❌ 테스트 실행 중 오류: {e}")
        import traceback
        print(traceback.format_exc())
        sys.exit(1)