import psutil
import time
import logging
import os
import sys

# 모듈 경로 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from msys.config import config

# 로깅 설정
log_dir = config.LOG_DIR
if not os.path.exists(log_dir):
    os.makedirs(log_dir)

logging.basicConfig(
    filename=os.path.join(log_dir, 'cpu_monitor.log'),
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def monitor_cpu(interval=5, test_mode=False, threshold=80, spike_threshold=20):
    """
    CPU 사용률을 모니터링하고 임계값 이상이거나 급격한 상승 시 로그를 기록합니다.
    고CPU 사용 시 상위 프로세스 정보도 기록합니다.

    Args:
        interval (int): 모니터링 간격 (초)
        test_mode (bool): 테스트 모드 (몇 번만 실행)
        threshold (int): CPU 사용률 임계값 (%)
        spike_threshold (int): 급격한 상승 임계값 (%)
    """
    count = 0
    prev_cpu = None
    last_logged_time = 0  # 마지막 로그 기록 시간
    while True:
        cpu_percent = psutil.cpu_percent(interval=1)
        logging.info(f"현재 CPU 사용률: {cpu_percent}%")
        current_time = time.time()

        should_log = False

        # 임계값 이상
        if cpu_percent >= threshold:
            should_log = True

        # 급격한 상승 감지 (이전 값과 비교)
        if prev_cpu is not None:
            cpu_increase = cpu_percent - prev_cpu
            if cpu_increase >= spike_threshold:
                should_log = True
                logging.warning(f"CPU 급격한 상승 감지: {prev_cpu}% → {cpu_percent}% (+{cpu_increase:.1f}%)")

        # 로그 기록 (스팸 방지: 10초 쿨다운)
        if should_log and (current_time - last_logged_time) > 10:
            logging.warning(f"CPU 사용률 경고: {cpu_percent}%")
            last_logged_time = current_time
            # 상위 CPU 사용 프로세스 기록
            try:
                processes = []
                for proc in psutil.process_iter(['pid', 'name', 'cpu_percent']):
                    try:
                        proc.cpu_percent(interval=0.1)  # 짧은 간격으로 측정
                        processes.append(proc)
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        continue

                # CPU 사용률로 정렬
                processes.sort(key=lambda p: p.cpu_percent(), reverse=True)
                top_processes = processes[:5]  # 상위 5개

                logging.warning("상위 CPU 사용 프로세스:")
                for proc in top_processes:
                    try:
                        logging.warning(f"  PID: {proc.pid}, 이름: {proc.name()}, CPU: {proc.cpu_percent()}%")
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        continue
            except Exception as e:
                logging.error(f"프로세스 정보 수집 실패: {e}")

        prev_cpu = cpu_percent
        time.sleep(interval)
        if test_mode:
            count += 1
            if count >= 3:  # 테스트용으로 3번만
                break

if __name__ == "__main__":
    import sys
    test_mode = len(sys.argv) > 1 and sys.argv[1] == 'test'
    monitor_cpu(test_mode=test_mode)
