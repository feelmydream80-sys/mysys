"""
API 키 관리 테스트 실행기 - 최종 완성본
"""
import sys
import os

# 프로젝트 경로 설정
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest


def main():
    """메인 테스트 실행 함수"""
    print("=" * 50)
    print("API 키 관리 기능 테스트 - 최종 완성본")
    print("=" * 50)
    
    try:
        # pytest를 사용하여 테스트 실행
        result = pytest.main([
            'tests/test_api_key_mngr.py',
            'tests/test_api_key_mngr_simple.py',
            'tests/test_api_key_mngr_full_flow.py',
            'tests/test_con_mst_dao_fix_updated.py',
            '-v',
            '--tb=short'
        ])
        
        if result == 0:
            print("\n모든 테스트가 성공적으로 완료되었습니다!")
        else:
            print(f"\n테스트 실패: {result}")
            return False
            
    except Exception as e:
        print(f"\n테스트 실행 중 오류 발생: {e}")
        import traceback
        print(traceback.format_exc())
        return False
        
    return True


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)