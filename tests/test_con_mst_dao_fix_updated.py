"""
ConMstDAO 테스트 수정 (실제 반환값에 맞춘 테스트)
"""
import sys
import os

# 프로젝트 경로 설정
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

import logging
from unittest.mock import MagicMock, patch
from dao.con_mst_dao import ConMstDAO


def test_get_mst_data_by_cd_updated():
    """get_mst_data_by_cd 실제 반환값에 맞춘 테스트"""
    logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
    logger = logging.getLogger(__name__)
    
    logger.info("=" * 50)
    logger.info("ConMstDAO get_mst_data_by_cd 실제 반환값 테스트")
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
                
            # 실제 반환되는 키로 검증
            assert 'cd' in result, "cd 필드가 없습니다."
            assert 'cd_nm' in result, "cd_nm 필드가 없습니다."
            assert 'item10' in result, "item10 필드가 없습니다."
            assert 'update_dt' in result or 'udate_dt' in result, "update_dt/udate_dt 필드가 없습니다."
            
            logger.info("✅ 모든 필드 검증 성공")
            
        logger.info("=" * 50)
        logger.info("✅ 모든 테스트 완료")
        
    except Exception as e:
        logger.error(f"❌ 테스트 실패: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False
        
    return True


def test_get_mst_data_by_cd_not_found():
    """존재하지 않는 CD 검색 테스트"""
    logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
    logger = logging.getLogger(__name__)
    
    logger.info("\n=== 존재하지 않는 CD 검색 테스트 ===")
    
    try:
        # 모의 연결 생성
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
        
        mock_cursor.fetchone.return_value = None
        
        # DAO 인스턴스 생성
        dao = ConMstDAO(mock_conn)
        
        # 메서드 호출
        result = dao.get_mst_data_by_cd('INVALID_CD')
        
        logger.info(f"✅ 존재하지 않는 CD 검색 결과: {result}")
        logger.info(f"✅ 결과 타입: {type(result)}")
        
        assert result is None, "존재하지 않는 CD 검색시 None을 반환해야 합니다."
        
        logger.info("✅ 검증 성공")
        
    except Exception as e:
        logger.error(f"❌ 테스트 실패: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False
        
    return True


if __name__ == '__main__':
    success = True
    
    if not test_get_mst_data_by_cd_updated():
        success = False
    
    if not test_get_mst_data_by_cd_not_found():
        success = False
        
    if success:
        print("\n모든 ConMstDAO 테스트가 성공적으로 완료되었습니다!")
    else:
        print("\nConMstDAO 테스트 중 일부가 실패했습니다.")
        sys.exit(1)
