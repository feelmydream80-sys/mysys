import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

import sys
sys.path.append('.')
from msys_app import create_app
from datetime import datetime

def debug_api_key_expiry_info():
    print("=== API 키 유통기한 정보 조회 디버그 ===")
    
    try:
        app = create_app()
        
        with app.app_context():
            from dao.api_key_mngr_dao import ApiKeyMngrDao
            dao = ApiKeyMngrDao()
            data = dao.select_all()
            print(f"DAO select_all 개수: {len(data)}")
            
            if data:
                print("\n=== DAO에서 반환된 데이터 ===")
                for item in data:
                    print(item)
                    print("type(start_dt):", type(item['start_dt']))
                    print()
                
                print("\n=== 유통기한 계산 과정 ===")
                today = datetime.now().date()
                print("오늘 날짜:", today)
                
                expiry_info = []
                for item in data:
                    cd = item['cd']
                    start_dt = item['start_dt']
                    due = item['due']
                    
                    print(f"\nCD: {cd}")
                    print(f"start_dt: {start_dt}, type: {type(start_dt)}")
                    print(f"due: {due}, type: {type(due)}")
                    
                    if start_dt:
                        try:
                            # START_DT 타입 확인 및 처리
                            if hasattr(start_dt, 'strftime'):
                                # datetime.date 또는 datetime.datetime 타입
                                start_date = start_dt
                                if hasattr(start_date, 'date'):
                                    start_date = start_date.date()
                                start_dt_str = start_date.strftime('%Y-%m-%d')
                            else:
                                # 문자열 타입
                                start_date = datetime.strptime(start_dt, '%Y-%m-%d').date()
                                start_dt_str = start_dt
                            
                            print(f"start_date: {start_date}")
                            
                            # 유통기한 종료일 계산 (START_DT + DUE년)
                            expiry_date = start_date.replace(year=start_date.year + due)
                            print(f"expiry_date: {expiry_date}")
                            
                            # 남은 기간 계산 (월 단위)
                            remaining_months = (expiry_date.year - today.year) * 12 + (expiry_date.month - today.month)
                            print(f"remaining_months: {remaining_months}")
                            
                            # 남은 기간 계산 (일 단위)
                            remaining_days = (expiry_date - today).days
                            print(f"remaining_days: {remaining_days}")
                            
                            # 긴급 여부 (1개월 이내)
                            is_urgent = remaining_months < 1
                            print(f"is_urgent: {is_urgent}")
                            
                            expiry_info.append({
                                'cd': cd,
                                'start_dt': start_dt_str,
                                'due': due,
                                'expiry_date': expiry_date.strftime('%Y-%m-%d'),
                                'remaining_months': remaining_months,
                                'remaining_days': remaining_days,
                                'is_urgent': is_urgent
                            })
                        except Exception as e:
                            print(f"CD: {cd} 유통기한 계산 오류: {e}")
                            import traceback
                            print("상세 오류:", traceback.format_exc())
                            continue
                
                print("\n=== 최종 expiry_info ===")
                print(f"개수: {len(expiry_info)}")
                for info in expiry_info:
                    print(info)
            else:
                print("DAO에서 데이터를 가져오지 못했습니다.")
                
    except Exception as e:
        print(f"\n오류 발생: {e}")
        import traceback
        print("\n상세 오류 스택:")
        print(traceback.format_exc())

if __name__ == "__main__":
    debug_api_key_expiry_info()