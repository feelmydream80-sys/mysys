"""
API 키 관리 CD 업데이트 테스트 (최종 버전)
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from msys_app import create_app

def test_update_cd_final():
    app = create_app()
    with app.app_context():
        print("=== CD 업데이트 테스트 (최종) ===")
        print()
        
        from msys.database import get_db_connection
        conn = None
        try:
            conn = get_db_connection()
            
            # 1. TB_MNGR_SETT에 있는 CD 조회
            print("1. TB_MNGR_SETT CD 조회")
            with conn.cursor() as cur:
                cur.execute("SELECT CD FROM TB_MNGR_SETT")
                mngr_cds = [row[0] for row in cur.fetchall()]
                print(f"   개수: {len(mngr_cds)}")
            
            # 2. TB_API_KEY_MNGR에 있는 CD 조회
            print("\n2. TB_API_KEY_MNGR CD 조회")
            with conn.cursor() as cur:
                cur.execute("SELECT CD FROM TB_API_KEY_MNGR")
                api_cds = [row[0] for row in cur.fetchall()]
                print(f"   개수: {len(api_cds)}")
            
            # 3. TB_MNGR_SETT에 있지만 TB_API_KEY_MNGR에 없는 CD 찾기
            print("\n3. TB_MNGR_SETT에만 있는 CD")
            missing_cds = [cd for cd in mngr_cds if cd not in api_cds]
            print(f"   개수: {len(missing_cds)}")
            if missing_cds:
                for cd in missing_cds:
                    print(f"   CD: {cd}")
            else:
                print("   모든 CD가 TB_API_KEY_MNGR에 존재합니다.")
            
            # 4. TB_CON_MST에서 ITEM10과 UPDATE_DT 조회
            if missing_cds:
                print("\n4. TB_CON_MST에서 CD 정보 조회")
                from dao.api_key_mngr_dao import ApiKeyMngrDao
                api_key_dao = ApiKeyMngrDao()
                
                added_count = 0
                for cd in missing_cds:
                    with conn.cursor() as cur:
                        cur.execute("SELECT ITEM10, UPDATE_DT FROM TB_CON_MST WHERE CD = %s", (cd,))
                        con_mst_data = cur.fetchone()
                        
                    if con_mst_data:
                        item10 = con_mst_data[0]
                        update_dt = con_mst_data[1]
                        
                        print(f"   CD: {cd}")
                        print(f"      ITEM10: {item10}")
                        print(f"      UPDATE_DT: {update_dt}")
                        
                        # API 키 관리 데이터 추가
                        if update_dt:
                            start_dt = update_dt.strftime('%Y-%m-%d')
                        else:
                            from datetime import datetime
                            start_dt = datetime.now().strftime('%Y-%m-%d')
                        
                        api_key_dao.insert(
                            cd=cd,
                            due=1,
                            start_dt=start_dt,
                            api_ownr_email_addr=item10,
                            conn=conn
                        )
                        
                        added_count += 1
                
                conn.commit()
                print(f"\n5. 성공적으로 {added_count}개의 CD를 추가했습니다.")
                
                # 6. 최종 데이터 조회
                print("\n6. 최종 TB_API_KEY_MNGR 데이터")
                with conn.cursor() as cur:
                    cur.execute("SELECT CD, API_OWNR_EMAIL_ADDR, START_DT, DUE FROM TB_API_KEY_MNGR")
                    final_data = cur.fetchall()
                    print(f"   개수: {len(final_data)}")
                    for row in final_data:
                        print(f"   CD: {row[0]}, Email: {row[1]}, 시작일: {row[2]}, 기간: {row[3]}년")
                        
                # 7. 확인: 추가된 CD 검증
                print("\n7. 추가된 CD 검증")
                new_added_cds = [cd for cd in mngr_cds if cd not in api_cds]
                if new_added_cds:
                    print(f"   추가되지 않은 CD 개수: {len(new_added_cds)}")
                    for cd in new_added_cds:
                        print(f"   CD: {cd}")
                else:
                    print("   모든 TB_MNGR_SETT의 CD가 TB_API_KEY_MNGR에 추가되었습니다.")
            else:
                print("\n5. 추가할 CD가 없습니다.")
                
        except Exception as e:
            print(f"\n오류: {e}")
            import traceback
            print(traceback.format_exc())
            if conn:
                conn.rollback()
        finally:
            if conn:
                try:
                    conn.close()
                except:
                    pass

if __name__ == "__main__":
    test_update_cd_final()