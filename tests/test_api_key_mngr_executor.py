"""
API 키 관리 기능 간단 테스트 실행기 (pytest를 통한 실행)
"""
import subprocess
import sys
import os

# 프로젝트 경로 설정
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

def run_test(test_file):
    """단일 테스트 파일 실행"""
    test_path = os.path.join(PROJECT_ROOT, 'tests', test_file)
    
    print("\n실행 중: {}".format(test_file))
    print("-" * 50)
    
    try:
        result = subprocess.run([
            sys.executable, '-m', 'pytest', 
            test_path, 
            '-v'
        ], capture_output=True, text=True, cwd=PROJECT_ROOT)
        
        print(result.stdout)
        if result.stderr:
            print("오류: {}".format(result.stderr))
            
        return result.returncode == 0
        
    except Exception as e:
        print("테스트 실행 오류: {}".format(e))
        return False

def main():
    """메인 테스트 실행 함수"""
    print("=" * 50)
    print("API 키 관리 기능 테스트 실행기")
    print("=" * 50)
    
    test_files = [
        'test_api_key_mngr.py',          # 기존 DAO/SERVICE 테스트
        'test_api_key_mngr_simple.py'    # 간단한 테스트
    ]
    
    all_passed = True
    
    for test_file in test_files:
        if not run_test(test_file):
            all_passed = False
            print("\n{} 실패".format(test_file))
        else:
            print("\n{} 성공".format(test_file))
            
    print("\n" + "=" * 50)
    if all_passed:
        print("모든 테스트가 성공적으로 통과했습니다!")
        return True
    else:
        print("일부 테스트가 실패했습니다.")
        return False


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)