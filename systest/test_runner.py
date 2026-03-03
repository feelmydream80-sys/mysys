#!/usr/bin/env python3
"""
시스템 테스트 실행기
"""

import os
import sys
import unittest
import argparse
from datetime import datetime
from test_config import REPORT_DIR

def setup_report_dir():
    """보고서 디렉토리 설정"""
    os.makedirs(REPORT_DIR, exist_ok=True)

def run_tests():
    """테스트 실행"""
    setup_report_dir()
    
    # 테스트 케이스 로드
    test_loader = unittest.TestLoader()
    test_suite = test_loader.discover(os.path.dirname(__file__), pattern='test_*.py')
    
    # 테스트 실행
    test_runner = unittest.TextTestRunner(
        stream=sys.stdout,
        verbosity=2
    )
    
    result = test_runner.run(test_suite)
    
    # 테스트 결과 요약
    print("\n" + "="*50)
    print("테스트 결과 요약")
    print("="*50)
    print(f"총 테스트 케이스: {result.testsRun}")
    print(f"성공: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"실패: {len(result.failures)}")
    print(f"오류: {len(result.errors)}")
    
    if result.failures:
        print("\n" + "="*50)
        print("실패한 테스트 케이스")
        print("="*50)
        for test, traceback in result.failures:
            print(f"- {test}: {traceback.splitlines()[-1]}")
    
    if result.errors:
        print("\n" + "="*50)
        print("오류가 발생한 테스트 케이스")
        print("="*50)
        for test, traceback in result.errors:
            print(f"- {test}: {traceback.splitlines()[-1]}")
    
    return result

def main():
    """메인 함수"""
    parser = argparse.ArgumentParser(description="시스템 테스트 실행기")
    parser.add_argument(
        "-p", "--page",
        help="테스트할 페이지명 (예: dashboard, admin, chart_analysis, data_analysis, data_spec, raw_data, jandi, api_test)",
        choices=["dashboard", "admin", "chart_analysis", "data_analysis", "data_spec", "raw_data", "jandi", "api_test"]
    )
    parser.add_argument(
        "-o", "--output",
        help="테스트 결과 출력 파일",
        default=f"test_result_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    )
    
    args = parser.parse_args()
    
    setup_report_dir()
    
    if args.page:
        # 특정 페이지 테스트 실행
        test_file = os.path.join(os.path.dirname(__file__), f"test_{args.page}.py")
        if os.path.exists(test_file):
            print(f"=== {args.page} 페이지 테스트 시작 ===")
            test_suite = unittest.TestLoader().discover(
                os.path.dirname(__file__),
                pattern=f"test_{args.page}.py"
            )
            with open(os.path.join(REPORT_DIR, args.output), "w", encoding="utf-8") as f:
                test_runner = unittest.TextTestRunner(
                    stream=f,
                    verbosity=2
                )
                result = test_runner.run(test_suite)
                
            # 테스트 결과 요약
            with open(os.path.join(REPORT_DIR, args.output), "a", encoding="utf-8") as f:
                f.write("\n" + "="*50 + "\n")
                f.write("테스트 결과 요약\n")
                f.write("="*50 + "\n")
                f.write(f"총 테스트 케이스: {result.testsRun}\n")
                f.write(f"성공: {result.testsRun - len(result.failures) - len(result.errors)}\n")
                f.write(f"실패: {len(result.failures)}\n")
                f.write(f"오류: {len(result.errors)}\n")
                
            print(f"테스트 결과가 {os.path.join(REPORT_DIR, args.output)}에 저장되었습니다.")
        else:
            print(f"테스트 파일이 존재하지 않습니다: {test_file}")
            sys.exit(1)
    else:
        # 모든 테스트 실행
        print("=== 모든 페이지 테스트 시작 ===")
        with open(os.path.join(REPORT_DIR, args.output), "w", encoding="utf-8") as f:
            test_runner = unittest.TextTestRunner(
                stream=f,
                verbosity=2
            )
            test_suite = unittest.TestLoader().discover(
                os.path.dirname(__file__),
                pattern="test_*.py"
            )
            result = test_runner.run(test_suite)
            
        # 테스트 결과 요약
        with open(os.path.join(REPORT_DIR, args.output), "a", encoding="utf-8") as f:
            f.write("\n" + "="*50 + "\n")
            f.write("테스트 결과 요약\n")
            f.write("="*50 + "\n")
            f.write(f"총 테스트 케이스: {result.testsRun}\n")
            f.write(f"성공: {result.testsRun - len(result.failures) - len(result.errors)}\n")
            f.write(f"실패: {len(result.failures)}\n")
            f.write(f"오류: {len(result.errors)}\n")
            
        print(f"테스트 결과가 {os.path.join(REPORT_DIR, args.output)}에 저장되었습니다.")
        
    return result

if __name__ == "__main__":
    result = main()
    if result.failures or result.errors:
        sys.exit(1)
    else:
        sys.exit(0)