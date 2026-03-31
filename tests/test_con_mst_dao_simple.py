"""
ConMstDAO 간단 테스트 (실제 동작 확인)
"""
import sys
import os

# 프로젝트 경로 설정
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

import logging
from unittest.mock import MagicMock, patch
from dao.con_mst_dao import ConMstDAO


def test_get_mst_data_by_cd_simple():
    """get_mst_data_by_cd 간단 테스트"""
    logging.basicConfig(level=logging.DEBUG)
    logger = logging.getLogger(__name__)
    
    logger.info("=" * 50)
    logger.info("ConMstDAO get_mst_data_by_cd 간단 테스트")
    logger.info("=" * 50)
    
    try:
        # 모의 연결 생성
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
        
        # DAO 인스턴스 생성
        dao = ConMstDAO(mock_conn)
        
        logger.info("✅ ConMstDAO 인스턴스 생성 성공")
        
        # 모의 결과 설정
        mock_result = (
            'CD001',
            '테스트 데이터',
            '설명',
            '값1', '값2', '값3', '값4', '값5',
            '값6', '값7', '값8', '값9', '값10',
            'Y', '2024-01-15'
        )
        
        mock_cursor.fetchone.return_value = mock_result
        mock_cursor.description = [
            ('cd',), ('cd_nm',), ('cd_desc',), 
            ('item1',), ('item2',), ('item3',), ('item4',), ('item5',),
            ('item6',), ('item7',), ('item8',), ('item9',), ('item10',),
            ('use_yn',), ('udate_dt',)
        ]
        
        logger.info("✅ 모의 데이터 설정 완료")
        
        # 메서드 호출
        result = dao.get_mst_data_by_cd('CD001')
        
        logger.info(f"✅ 메서드 호출 결과: {result}")
        
        if result is not None:
            logger.info(f"✅ 결과 타입: {type(result)}")
            
            # 키 목록 출력
            logger.info(f"✅ 결과 키: {list(result.keys())}")
            
            # 각 필드 값 출력
            for key, value in result.items():
                logger.info(f"   {key}: {value}")
                
        logger.info("=" * 50)
        logger.info("✅ 모든 테스트 완료")
        
    except Exception as e:
        logger.error(f"❌ 테스트 실패: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False
        
    return True


if __name__ == '__main__':
    success = test_get_mst_data_by_cd_simple()
    sys.exit(0 if success else 1)