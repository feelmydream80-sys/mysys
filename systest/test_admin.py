"""
관리자 설정 페이지 테스트
"""

import unittest
import time
from test_base import BaseTest
from test_config import PASS_CRITERIA

class AdminTest(BaseTest):
    """관리자 설정 페이지 테스트"""
    
    def setUp(self):
        """테스트 전 설정"""
        self.setup_browser()
        self.login("admin_user")
        
    def tearDown(self):
        """테스트 후 정리"""
        self.test_end_time = time.time()
        self.logout()
        self.teardown_browser()
        
    def test_page_load(self):
        """페이지 로딩 테스트"""
        try:
            self.navigate_to_page("admin")
            
            # 페이지 로딩 시간 확인
            load_time = self.get_page_load_time()
            self.logger.info(f"관리자 설정 페이지 로딩 시간: {load_time:.2f} 초")
            self.assertLessEqual(
                load_time,
                PASS_CRITERIA["page_load_time"],
                f"페이지 로딩 시간이 {PASS_CRITERIA['page_load_time']} 초를 초과합니다: {load_time:.2f} 초"
            )
            
            # 설정 정보 조회 API 호출 확인
            # TODO: API 호출 테스트 추가
            
            # 아이콘 정보 조회 API 호출 확인
            # TODO: API 호출 테스트 추가
            
            # 사용자 목록 조회 API 호출 확인
            # TODO: API 호출 테스트 추가
            
            self.logger.info("관리자 설정 페이지 로딩 테스트 성공")
            
        except Exception as e:
            self.logger.error(f"관리자 설정 페이지 로딩 테스트 오류: {e}")
            self.take_screenshot("admin_page_load_error")
            raise
            
    def test_save_basic_settings(self):
        """기본 설정 저장 테스트"""
        try:
            self.navigate_to_page("admin")
            
            # 기본 설정 탭에서 설정 변경
            self.click_button(("css selector", "button[data-tab='basicSettings']"), "기본 설정 탭")
            
            # Job ID 필드에 값 입력
            # TODO: 실제 필드 locator 확인 필요
            job_id_input = self.wait_for_element(("css selector", "#settingsTableBody input[data-field='cd_nm']"), "Job 이름 필드")
            job_id_input.clear()
            job_id_input.send_keys("테스트 Job")
            
            # 기본 설정 저장 버튼 클릭
            self.click_button(("css selector", "#saveBasicSettingsBtn"), "기본 설정 저장")
            
            # 저장 완료 확인
            self.wait_for_element(("css selector", ".message.success"), "저장 성공 메시지")
            
            self.logger.info("기본 설정 저장 테스트 성공")
            
        except Exception as e:
            self.logger.error(f"기본 설정 저장 테스트 오류: {e}")
            self.take_screenshot("admin_save_basic_settings_error")
            raise
            
    def test_schedule_settings(self):
        """수집 스케줄 설정 테스트"""
        try:
            self.navigate_to_page("admin")
            
            # 수집 스케줄 설정 탭으로 이동
            self.click_button(("css selector", "button[data-tab='scheduleSettings']"), "수집 스케줄 설정 탭")
            
            # 그룹화 최소 개수 변경
            grp_min_cnt = self.wait_for_element(("css selector", "#grpMinCnt"), "그룹화 최소 개수")
            grp_min_cnt.clear()
            grp_min_cnt.send_keys("4")
            
            # 스케줄 설정 저장
            self.click_button(("css selector", "#saveScheduleSettingsBtn"), "스케줄 설정 저장")
            
            # 저장 완료 확인
            self.wait_for_element(("css selector", ".message.success"), "스케줄 설정 저장 성공")
            
            self.logger.info("수집 스케줄 설정 테스트 성공")
            
        except Exception as e:
            self.logger.error(f"수집 스케줄 설정 테스트 오류: {e}")
            self.take_screenshot("admin_schedule_settings_error")
            raise
            
    def test_icon_management(self):
        """아이콘 관리 테스트"""
        try:
            self.navigate_to_page("admin")
            
            # 아이콘 관리 탭으로 이동
            self.click_button(("css selector", "button[data-tab='iconManagement']"), "아이콘 관리 탭")
            
            # 아이콘 추가
            self.input_text(("css selector", "#iconCode"), "✅", "아이콘 코드")
            self.input_text(("css selector", "#iconName"), "성공 아이콘", "아이콘 이름")
            self.input_text(("css selector", "#iconDescription"), "성공 상태를 표시하는 아이콘", "아이콘 설명")
            
            # 아이콘 저장
            self.click_button(("css selector", "#saveIconBtn"), "아이콘 추가")
            
            # 아이콘 추가 완료 확인
            self.wait_for_element(("css selector", "#iconTableBody tr:last-child"), "새 아이콘")
            
            self.logger.info("아이콘 관리 테스트 성공")
            
        except Exception as e:
            self.logger.error(f"아이콘 관리 테스트 오류: {e}")
            self.take_screenshot("admin_icon_management_error")
            raise
            
    def test_user_management(self):
        """사용자 관리 테스트"""
        try:
            self.navigate_to_page("admin")
            
            # 사용자 관리 탭으로 이동
            self.click_button(("css selector", "button[data-tab='userManagement']"), "사용자 관리 탭")
            
            # 사용자 검색
            search_input = self.wait_for_element(("css selector", "#userSearchInput"), "사용자 검색 입력")
            search_input.send_keys("test")
            
            # 검색 결과 확인
            self.wait_for_element(("css selector", "#userTableBody tr"), "사용자 목록")
            
            self.logger.info("사용자 관리 테스트 성공")
            
        except Exception as e:
            self.logger.error(f"사용자 관리 테스트 오류: {e}")
            self.take_screenshot("admin_user_management_error")
            raise
            
    def test_data_access_permission(self):
        """데이터 접근 권한 설정 테스트"""
        try:
            self.navigate_to_page("admin")
            
            # 데이터 접근 권한 탭으로 이동
            self.click_button(("css selector", "button[data-tab='dataAccessPermission']"), "데이터 접근 권한 탭")
            
            # 사용자 선택
            self.wait_for_element(("css selector", "#dataPermissionUserTableBody tr:first-child"), "사용자 목록")
            self.click_button(("css selector", "#dataPermissionUserTableBody tr:first-child .manage-permission-btn"), "권한 관리 버튼")
            
            # 권한 설정 모달 확인
            self.wait_for_element(("css selector", "#dataPermissionModal"), "데이터 접근 권한 모달")
            
            self.logger.info("데이터 접근 권한 설정 테스트 성공")
            
        except Exception as e:
            self.logger.error(f"데이터 접근 권한 설정 테스트 오류: {e}")
            self.take_screenshot("admin_data_access_permission_error")
            raise
            
    def test_excel_template_management(self):
        """엑셀 양식 관리 테스트"""
        try:
            self.navigate_to_page("admin")
            
            # 엑셀 양식 관리 탭으로 이동
            self.click_button(("css selector", "button[data-tab='excelTemplateManagement']"), "엑셀 양식 관리 탭")
            
            # 엑셀 템플릿 정보 로드 확인
            self.wait_for_element(("css selector", "#excelTemplateInfo"), "엑셀 템플릿 정보")
            
            self.logger.info("엑셀 양식 관리 테스트 성공")
            
        except Exception as e:
            self.logger.error(f"엑셀 양식 관리 테스트 오류: {e}")
            self.take_screenshot("admin_excel_template_error")
            raise
            
    def test_statistics_view(self):
        """통계 탭 테스트"""
        try:
            self.navigate_to_page("admin")
            
            # 통계 탭으로 이동
            self.click_button(("css selector", "button[data-tab='statistics']"), "통계 탭")
            
            # 통계 데이터 로드 확인
            self.wait_for_element(("css selector", "#statsSummary"), "통계 요약")
            
            self.logger.info("통계 탭 테스트 성공")
            
        except Exception as e:
            self.logger.error(f"통계 탭 테스트 오류: {e}")
            self.take_screenshot("admin_statistics_error")
            raise

if __name__ == "__main__":
    unittest.main()