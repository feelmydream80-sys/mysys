"""
API 키 관리 CD 업데이트 테스트
"""
import sys
import os

# 프로젝트 경로 설정
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from msys_app import create_app
from msys.database import get_db_connection, close_db_connection


def test_update_cd():
    """CD 업데이트 기능 테스트"""
    app = create_app()

    with app.app_context():
        print('=' * 60)
        print('CD 업데이트 기능 테스트')
        print('=' * 60)

        try:
            # 모든 작업을 하나의 연결에서 처리
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # 1. 현재 API 키 관리 데이터 조회
            print("\n1. 현재 API 키 관리 데이터:")
            from dao.api_key_mngr_dao import ApiKeyMngrDao
            dao = ApiKeyMngrDao()
            current_data = dao.select_all(conn)
            print(f"현재 데이터 개수: {len(current_data)}")
            if len(current_data) > 0:
                for item in current_data:
                    print(f"  CD: {item.get('cd', 'N/A')}")

            # 2. TB_MNGR_SETT에 있는 CD 중 TB_API_KEY_MNGR에 없는 CD 조회
            print("\n2. TB_MNGR_SETT에서 TB_API_KEY_MNGR에 없는 CD 조회:")
            
            # TB_MNGR_SETT에 있는 CD 조회
            cursor.execute("SELECT CD FROM TB_MNGR_SETT")
            mngr_sett_cds = [row[0] for row in cursor.fetchall()]
            print(f"TB_MNGR_SETT에 있는 CD 개수: {len(mngr_sett_cds)}")
            
            # TB_API_KEY_MNGR에 있는 CD 조회
            cursor.execute("SELECT CD FROM TB_API_KEY_MNGR")
            api_key_cds = [row[0] for row in cursor.fetchall()]
            print(f"TB_API_KEY_MNGR에 있는 CD 개수: {len(api_key_cds)}")
            
            # 없는 CD 찾기
            missing_cds = [cd for cd in mngr_sett_cds if cd not in api_key_cds]
            print(f"TB_MNGR_SETT에 있지만 TB_API_KEY_MNGR에 없는 CD 개수: {len(missing_cds)}")
            if len(missing_cds) > 0:
                for cd in missing_cds:
                    print(f"  CD: {cd}")
                
                # 3. TB_CON_MST에서 CD에 대한 ITEM10과 UPDATE_DT 조회 테스트
                print("\n3. TB_CON_MST에서 CD에 대한 정보 조회:")
                for cd in missing_cds:
                    cursor.execute("""
                        SELECT CD, CD_NM, ITEM10, UPDATE_DT 
                        FROM TB_CON_MST 
                        WHERE CD = %s
                    """, (cd,))
                    row = cursor.fetchone()
                    if row:
                        print(f"  CD: {row[0]}")
                        print(f"     CD_NM: {row[1]}")
                        print(f"     ITEM10: {row[2]}")
                        print(f"     UPDATE_DT: {row[3]}")
                    else:
                        print(f"  CD: {cd} - TB_CON_MST에 데이터 없음")
                
                # 4. TB_API_KEY_MNGR에 CD 추가
                print("\n4. TB_API_KEY_MNGR에 CD 추가:")
                from dao.api_key_mngr_dao import ApiKeyMngrDao
                api_key_dao = ApiKeyMngrDao()
                
                added_count = 0
                for cd in missing_cds:
                    cursor.execute("""
                        SELECT ITEM10, UPDATE_DT 
                        FROM TB_CON_MST 
                        WHERE CD = %s
                    """, (cd,))
                    row = cursor.fetchone()
                    if row:
                        item10 = row[0]
                        update_dt = row[1]
                        
                        # UPDATE_DT를 문자열로 변환 (YYYY-MM-DD 형식)
                        if update_dt:
                            start_dt = update_dt.strftime('%Y-%m-%d')
                        else:
                            from datetime import datetime
                            start_dt = datetime.now().strftime('%Y-%m-%d')
                        
                        # API 키 관리 정보 추가
                        api_key_dao.insert(
                            cd=cd,
                            due=1,
                            start_dt=start_dt,
                            api_ownr_email_addr=item10,
                            conn=conn
                        )
                        
                        added_count += 1
                        print(f"  CD: {cd} 추가 성공")
                    else:
                        print(f"  CD: {cd} - TB_CON_MST에 데이터가 없어 추가하지 않음")
                
                conn.commit()
                print(f"\n총 {added_count}개의 CD를 추가했습니다.")
                
                # 5. 업데이트 후 데이터 조회
                print("\n5. 업데이트 후 API 키 관리 데이터:")
                updated_data = api_key_dao.select_all(conn)
                print(f"업데이트 후 데이터 개수: {len(updated_data)}")
                if len(updated_data) > 0:
                    for item in updated_data:
                        print(f"  CD: {item.get('cd', 'N/A')}")
            
            cursor.close()
            conn.close()

        except Exception as e:
            print(f"테스트 실행 오류: {e}")
            import traceback
            print(traceback.format_exc())
            if 'conn' in locals():
                try:
                    conn.rollback()
                    conn.close()
                except:
                    pass


if __name__ == "__main__":
    test_update_cd()