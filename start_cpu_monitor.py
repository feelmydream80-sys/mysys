#!/usr/bin/env python3
"""
CPU 모니터링 프로그램 시작 스크립트
백그라운드에서 CPU 사용률을 모니터링합니다.
"""

import subprocess
import sys
import os

# 모듈 경로 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def start_monitor():
    """
    CPU 모니터링을 백그라운드에서 시작합니다.
    """
    try:
        # Windows에서 pythonw.exe를 사용해 GUI 없이 실행
        if os.name == 'nt':
            subprocess.Popen(['pythonw', 'utils/cpu_monitor.py'], creationflags=subprocess.CREATE_NO_WINDOW)
        else:
            # Linux/Mac에서는 nohup 사용
            subprocess.Popen(['nohup', 'python', 'utils/cpu_monitor.py'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print("CPU 모니터링 프로그램이 백그라운드에서 시작되었습니다.")
    except Exception as e:
        print(f"모니터링 시작 실패: {e}")

if __name__ == "__main__":
    start_monitor()
