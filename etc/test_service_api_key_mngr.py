#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""API 키 관리 서비스 테스트"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
import warnings
warnings.filterwarnings('ignore')  # 경고 메시지 무시

from msys_app import create_app
from service.api_key_mngr_service import ApiKeyMngrService

# 로그 설정
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def test_service():
    """API 키 관리 서비스 테스트 - Flask 애플리케이션 컨텍스트에서 실행"""
    try:
        logger.info("=== API 키 관리 서비스 테스트 시작 ===")
        
        # Flask 애플리케이션 생성
        logger.info("=== Flask 애플리케이션 생성 ===")
        app = create_app()
        
        with app.app_context():
            # 서비스 생성
            logger.info("=== 서비스 인스턴스 생성 ===")
            service = ApiKeyMngrService()
            
            # 모든 API 키 관리 데이터 가져오기
            logger.info("=== 모든 API 키 관리 데이터 ===")
            data = service.get_all_api_key_mngr()
            if data:
                for item in data:
                    logger.info(item)
            else:
                logger.info("데이터 없음")
            
            # CD 업데이트 테스트
            logger.info("=== CD 업데이트 ===")
            result = service.update_cd_from_mngr_sett()
            logger.info(f"추가된 CD: {result['added_cds']}")
            logger.info(f"업데이트된 CD: {result['updated_cds']}")
        
        logger.info("=== 테스트 성공 ===")
        return True
        
    except Exception as e:
        logger.error(f"=== 테스트 실패: {e} ===")
        import traceback
        logger.error(traceback.format_exc())
        return False

if __name__ == "__main__":
    logger.info("API 키 관리 서비스 테스트 실행")
    success = test_service()
    if success:
        logger.info("✅ 테스트 성공")
        sys.exit(0)
    else:
        logger.error("❌ 테스트 실패")
        sys.exit(1)