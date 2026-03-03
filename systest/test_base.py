"""
테스트 기본 클래스
"""

import os
import logging
import time
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from test_config import (
    BASE_URL,
    BROWSER,
    HEADLESS,
    IMPLICIT_WAIT,
    EXPLICIT_WAIT,
    REPORT_DIR,
    SCREENSHOT_DIR,
    LOG_DIR,
    TEST_DATA,
    PASS_CRITERIA
)

# 로그 설정
def setup_logging():
    os.makedirs(LOG_DIR, exist_ok=True)
    log_file = os.path.join(LOG_DIR, f"test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler()
        ]
    )
    
    return logging.getLogger(__name__)

class BaseTest:
    """테스트 기본 클래스"""
    
    def __init__(self):
        self.logger = setup_logging()
        self.driver = None
        self.wait = None
        self.test_start_time = None
        self.test_end_time = None
        
    def setup_browser(self):
        """브라우저 설정"""
        try:
            if BROWSER == "chrome":
                from selenium.webdriver.chrome.options import Options
                chrome_options = Options()
                if HEADLESS:
                    chrome_options.add_argument("--headless")
                    chrome_options.add_argument("--window-size=1920,1080")
                self.driver = webdriver.Chrome(options=chrome_options)
                
            elif BROWSER == "firefox":
                from selenium.webdriver.firefox.options import Options
                firefox_options = Options()
                if HEADLESS:
                    firefox_options.add_argument("--headless")
                self.driver = webdriver.Firefox(options=firefox_options)
                
            elif BROWSER == "edge":
                from selenium.webdriver.edge.options import Options
                edge_options = Options()
                if HEADLESS:
                    edge_options.add_argument("--headless")
                    edge_options.add_argument("--window-size=1920,1080")
                self.driver = webdriver.Edge(options=edge_options)
                
            else:
                raise ValueError(f"지원하지 않는 브라우저: {BROWSER}")
                
            self.driver.implicitly_wait(IMPLICIT_WAIT)
            self.wait = WebDriverWait(self.driver, EXPLICIT_WAIT)
            self.driver.maximize_window()
            
            self.logger.info(f"브라우저 시작 완료: {BROWSER}")
            
        except Exception as e:
            self.logger.error(f"브라우저 시작 오류: {e}")
            raise
            
    def teardown_browser(self):
        """브라우저 종료"""
        if self.driver:
            self.driver.quit()
            self.logger.info("브라우저 종료")
            
    def login(self, user_type="test_user"):
        """로그인"""
        try:
            self.driver.get(f"{BASE_URL}login")
            self.test_start_time = time.time()
            
            user_data = TEST_DATA[user_type]
            
            # 사용자 ID 입력
            user_id_input = self.wait.until(
                EC.presence_of_element_located((By.ID, "login_user_id"))
            )
            user_id_input.send_keys(user_data["user_id"])
            
            # 비밀번호 입력
            password_input = self.wait.until(
                EC.presence_of_element_located((By.ID, "login_password"))
            )
            password_input.send_keys(user_data["password"])
            
            # 로그인 버튼 클릭
            login_button = self.wait.until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "button[type='submit']"))
            )
            login_button.click()
            
            # 수집 스케줄 페이지 로딩 확인 (로그인 후 기본 페이지)
            self.wait.until(
                EC.presence_of_element_located((By.CSS_SELECTOR, ".heatmap-container"))
            )
            
            self.logger.info(f"{user_type} 로그인 성공")
            
        except TimeoutException as e:
            self.logger.error(f"로그인 시간 초과: {e}")
            self.take_screenshot("login_timeout")
            raise
            
        except Exception as e:
            self.logger.error(f"로그인 오류: {e}")
            self.take_screenshot("login_error")
            raise
            
    def logout(self):
        """로그아웃"""
        try:
            # 로그아웃 버튼이 없을 경우 예외 처리 (로그만 남기고 종료)
            logout_button = None
            try:
                logout_button = self.wait.until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, ".logout-button"))
                )
            except TimeoutException:
                self.logger.warning("로그아웃 버튼을 찾을 수 없음")
                return
                
            logout_button.click()
            
            # 로그인 페이지 확인
            try:
                self.wait.until(
                    EC.presence_of_element_located((By.ID, "login_user_id"))
                )
                self.logger.info("로그아웃 성공")
            except TimeoutException:
                self.logger.warning("로그인 페이지로 이동하지 않았음")
                
        except Exception as e:
            self.logger.error(f"로그아웃 오류: {e}")
            self.take_screenshot("logout_error")
            # 로그아웃 실패해도 브라우저는 종료해야 하므로 예외를 상승시키지 않음
            
    def navigate_to_page(self, page_name):
        """페이지 이동"""
        from test_config import PAGES
        
        try:
            page_url = PAGES[page_name]
            self.driver.get(page_url)
            
            # 페이지 로딩 확인
            time.sleep(2)
            
            self.logger.info(f"{page_name} 페이지 이동 성공: {page_url}")
            
        except Exception as e:
            self.logger.error(f"{page_name} 페이지 이동 오류: {e}")
            self.take_screenshot(f"{page_name}_navigation_error")
            raise
            
    def take_screenshot(self, name):
        """스크린샷 찍기"""
        os.makedirs(SCREENSHOT_DIR, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{name}_{timestamp}.png"
        filepath = os.path.join(SCREENSHOT_DIR, filename)
        
        try:
            self.driver.save_screenshot(filepath)
            self.logger.info(f"스크린샷 저장: {filepath}")
            
        except Exception as e:
            self.logger.error(f"스크린샷 저장 오류: {e}")
            
    def get_page_load_time(self):
        """페이지 로딩 시간 반환"""
        if self.test_start_time and self.test_end_time:
            return self.test_end_time - self.test_start_time
        return 0
            
    def is_page_load_time_passed(self):
        """페이지 로딩 시간 합격 여부"""
        load_time = self.get_page_load_time()
        return load_time <= PASS_CRITERIA["page_load_time"]
            
    def click_button(self, locator, button_name):
        """버튼 클릭"""
        try:
            button = self.wait.until(
                EC.element_to_be_clickable(locator)
            )
            button.click()
            self.logger.info(f"{button_name} 버튼 클릭 성공")
            time.sleep(1)  # 클릭 후 대기
            
        except TimeoutException as e:
            self.logger.error(f"{button_name} 버튼 찾기 시간 초과: {e}")
            self.take_screenshot(f"{button_name}_button_timeout")
            raise
            
        except Exception as e:
            self.logger.error(f"{button_name} 버튼 클릭 오류: {e}")
            self.take_screenshot(f"{button_name}_button_error")
            raise
            
    def input_text(self, locator, text, field_name):
        """텍스트 입력"""
        try:
            element = self.wait.until(
                EC.presence_of_element_located(locator)
            )
            element.clear()
            element.send_keys(text)
            self.logger.info(f"{field_name} 입력 성공: {text}")
            
        except Exception as e:
            self.logger.error(f"{field_name} 입력 오류: {e}")
            self.take_screenshot(f"{field_name}_input_error")
            raise
            
    def select_checkbox(self, locator, checkbox_name):
        """체크박스 선택"""
        try:
            checkbox = self.wait.until(
                EC.presence_of_element_located(locator)
            )
            if not checkbox.is_selected():
                checkbox.click()
            self.logger.info(f"{checkbox_name} 체크박스 선택 성공")
            
        except Exception as e:
            self.logger.error(f"{checkbox_name} 체크박스 선택 오류: {e}")
            self.take_screenshot(f"{checkbox_name}_checkbox_error")
            raise
            
    def get_element_text(self, locator, element_name):
        """요소 텍스트 가져오기"""
        try:
            element = self.wait.until(
                EC.presence_of_element_located(locator)
            )
            return element.text
            
        except Exception as e:
            self.logger.error(f"{element_name} 텍스트 가져오기 오류: {e}")
            self.take_screenshot(f"{element_name}_text_error")
            raise
            
    def is_element_present(self, locator, element_name):
        """요소 존재 여부 확인"""
        try:
            self.wait.until(
                EC.presence_of_element_located(locator)
            )
            return True
            
        except TimeoutException:
            self.logger.warning(f"{element_name} 요소가 존재하지 않음")
            return False
            
    def wait_for_element(self, locator, element_name):
        """요소 대기"""
        try:
            return self.wait.until(
                EC.presence_of_element_located(locator)
            )
            
        except TimeoutException as e:
            self.logger.error(f"{element_name} 요소 대기 시간 초과: {e}")
            self.take_screenshot(f"{element_name}_wait_timeout")
            raise
            
    def execute_javascript(self, script):
        """JavaScript 실행"""
        try:
            return self.driver.execute_script(script)
            
        except Exception as e:
            self.logger.error(f"JavaScript 실행 오류: {e}")
            raise
            
    def scroll_to_element(self, locator):
        """요소까지 스크롤"""
        try:
            element = self.wait.until(
                EC.presence_of_element_located(locator)
            )
            self.driver.execute_script("arguments[0].scrollIntoView();", element)
            
        except Exception as e:
            self.logger.error(f"스크롤 오류: {e}")
            raise
            
    def accept_alert(self):
        """경고창 수락"""
        try:
            alert = self.wait.until(
                EC.alert_is_present()
            )
            alert.accept()
            self.logger.info("경고창 수락")
            
        except TimeoutException:
            self.logger.warning("경고창이 없음")
            
        except Exception as e:
            self.logger.error(f"경고창 수락 오류: {e}")
            raise
            
    def dismiss_alert(self):
        """경고창 거절"""
        try:
            alert = self.wait.until(
                EC.alert_is_present()
            )
            alert.dismiss()
            self.logger.info("경고창 거절")
            
        except TimeoutException:
            self.logger.warning("경고창이 없음")
            
        except Exception as e:
            self.logger.error(f"경고창 거절 오류: {e}")
            raise