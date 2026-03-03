"""
대시보드 페이지 테스트
"""

import unittest
import time
from test_base import BaseTest
from test_config import TEST_DATA, PASS_CRITERIA

class DashboardTest(unittest.TestCase):
    """대시보드 페이지 테스트"""
    
    def setUp(self):
        """테스트 전 설정"""
        self.test = BaseTest()
        self.test.setup_browser()
        self.test.login()
        
    def tearDown(self):
        """테스트 후 정리"""
        self.test.test_end_time = time.time()
        self.test.logout()
        self.test.teardown_browser()
        
    def test_page_load(self):
        """페이지 로딩 테스트"""
        try:
            self.test.navigate_to_page("dashboard")
            
            # 페이지 로딩 시간 확인
            load_time = self.test.get_page_load_time()
            self.test.logger.info(f"대시보드 페이지 로딩 시간: {load_time:.2f} 초")
            self.assertLessEqual(
                load_time,
                PASS_CRITERIA["page_load_time"],
                f"페이지 로딩 시간이 {PASS_CRITERIA['page_load_time']} 초를 초과합니다: {load_time:.2f} 초"
            )
            
            # 대시보드 요약 데이터 API 호출 확인
            # TODO: API 호출 테스트 추가
            
            # 이벤트 로그 조회 API 호출 확인
            # TODO: API 호출 테스트 추가
            
            self.test.logger.info("대시보드 페이지 로딩 테스트 성공")
            
        except Exception as e:
            self.test.logger.error(f"대시보드 페이지 로딩 테스트 오류: {e}")
            self.test.take_screenshot("dashboard_page_load_error")
            raise
            
    def test_date_filter(self):
        """날짜 필터 적용 테스트"""
        try:
            self.test.navigate_to_page("dashboard")
            
            # 날짜 입력 필드 찾기
            start_date_input = self.test.wait_for_element(
                ("css selector", "#startDate"),
                "시작 날짜 입력 필드"
            )
            end_date_input = self.test.wait_for_element(
                ("css selector", "#endDate"),
                "종료 날짜 입력 필드"
            )
            
            # 날짜 입력
            start_date = TEST_DATA["date_range"]["start_date"]
            end_date = TEST_DATA["date_range"]["end_date"]
            
            self.test.input_text(
                ("css selector", "#startDate"),
                start_date,
                "시작 날짜"
            )
            self.test.input_text(
                ("css selector", "#endDate"),
                end_date,
                "종료 날짜"
            )
            
            # 필터 적용 버튼 클릭
            self.test.click_button(
                ("css selector", "button[onclick='loadDashboardSummary()']"),
                "조회"
            )
            
            # 데이터 변경 확인
            # TODO: 데이터 변경 확인 로직 추가
            
            self.test.logger.info("날짜 필터 적용 테스트 성공")
            
        except Exception as e:
            self.test.logger.error(f"날짜 필터 적용 테스트 오류: {e}")
            self.test.take_screenshot("dashboard_date_filter_error")
            raise
            
    def test_refresh_button(self):
        """데이터 새로고침 버튼 테스트"""
        try:
            self.test.navigate_to_page("dashboard")
            
            # 새로고침 버튼 클릭 (대시보드에 새로고침 버튼이 없으므로 일단 주석처리)
            # self.test.click_button(
            #     ("css selector", "#refresh_button"),
            #     "새로고침"
            # )
            
            # 대신 조회 버튼을 클릭하여 데이터를 새로 로딩하는 방식으로 테스트
            self.test.click_button(
                ("css selector", "button[onclick='loadDashboardSummary()']"),
                "조회"
            )
            
            # 데이터 로딩 확인
            # TODO: 데이터 로딩 확인 로직 추가
            
            self.test.logger.info("데이터 새로고침 테스트 성공")
            
        except Exception as e:
            self.test.logger.error(f"데이터 새로고침 테스트 오류: {e}")
            self.test.take_screenshot("dashboard_refresh_error")
            raise
            
    def test_data_verification(self):
        """데이터 검증 테스트"""
        try:
            self.test.navigate_to_page("dashboard")
            
            # 총 Job ID 개수 확인
            total_jobs = self.test.get_element_text(
                ("css selector", "#totalJobsCount"),
                "총 Job ID 개수"
            )
            
            self.assertIsNotNone(total_jobs)
            self.assertNotEqual(total_jobs, "")
            self.assertGreater(int(total_jobs), 0)
            
            # 총 호출 건수 확인
            total_collections = self.test.get_element_text(
                ("css selector", "#totalCollectionsCount"),
                "총 호출 건수"
            )
            
            self.assertIsNotNone(total_collections)
            self.assertNotEqual(total_collections, "")
            self.assertGreater(int(total_collections), 0)
            
            # 일간 성공률 확인
            day_success_rate = self.test.get_element_text(
                ("css selector", "#daySuccessRate"),
                "일간 성공률"
            )
            
            self.assertIsNotNone(day_success_rate)
            self.assertNotEqual(day_success_rate, "")
            
            self.test.logger.info("데이터 검증 테스트 성공")
            
        except Exception as e:
            self.test.logger.error(f"데이터 검증 테스트 오류: {e}")
            self.test.take_screenshot("dashboard_data_verification_error")
            raise

if __name__ == "__main__":
    unittest.main()