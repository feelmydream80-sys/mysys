from flask import Blueprint, render_template, jsonify, request, session, current_app, send_file
from functools import wraps
from .auth_routes import login_required, admin_required
from dao.analytics_dao import AnalyticsDAO
from dao.mngr_sett_dao import MngrSettDAO
from service.dashboard_service import DashboardService
from msys.database import get_db_connection
import logging
import os
from datetime import datetime
from urllib.parse import quote
# import openpyxl
# from io import BytesIO
# from openpyxl.styles import Font, Alignment, Border, Side, PatternFill

admin_bp = Blueprint('admin', __name__)

def log_menu_access(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            user_id = session.get('user', {}).get('user_id')
            if user_id:
                url = request.path
                
                with get_db_connection() as conn:
                    mngr_sett_dao = MngrSettDAO(conn)
                    menu = mngr_sett_dao.get_menu_by_url(url)
                    
                    # menu_nm을 우선적으로 사용하고, 없으면 url 기록
                    menu_to_log = menu['menu_nm'] if menu and menu.get('menu_nm') else url
                    if not (menu and menu.get('menu_nm')):
                        current_app.logger.warning(f"Could not find menu name for url '{url}'. Logging url itself.")
                    
                    analytics_dao = AnalyticsDAO(conn)
                    analytics_dao.insert_user_access_log(user_id, menu_to_log)
        
        except Exception as e:
            current_app.logger.error(f"Failed to log menu access for url {request.path}: {e}")
        
        return f(*args, **kwargs)
    return decorated_function

@admin_bp.route('/admin/mngr_sett')
@login_required
@log_menu_access
def mngr_sett_page():
    """
    Renders the manager settings page.
    """
    if 'mngr_sett' not in session.get('user', {}).get('permissions', []):
        return render_template("unauthorized.html")
    conn = None
    try:
        conn = get_db_connection()
        mngr_sett_dao = MngrSettDAO(conn)
        menus = mngr_sett_dao.get_all_menu_settings()
    except Exception as e:
        logging.error(f"Error fetching menu settings for mngr_sett_page: {e}", exc_info=True)
        menus = []  # 에러 발생 시 빈 리스트 전달
    finally:
        if conn:
            conn.close()
            
    return render_template('mngr_sett.html', menus=menus)

@admin_bp.route('/api/statistics/config', methods=['GET'])
@login_required
def get_statistics_config():
    """
    통계 필터에 필요한 설정 데이터(연도, 메뉴 목록)를 반환합니다.
    """
    if 'mngr_sett' not in session.get('user', {}).get('permissions', []):
        return jsonify({'error': '권한이 없습니다.'}), 403
    conn = None
    try:
        conn = get_db_connection()
        analytics_dao = AnalyticsDAO(conn)
        
        available_years_months = analytics_dao.get_available_years_months()
        years = sorted(list(set(item['year'] for item in available_years_months)), reverse=True)

        mngr_sett_dao = MngrSettDAO(conn)
        menus = mngr_sett_dao.get_all_menu_settings()
        
        return jsonify({
            'years': years,
            'menus': menus
        })
    except Exception as e:
        logging.error(f"Error fetching statistics config: {e}", exc_info=True)
        return jsonify({'error': 'Failed to load configuration data'}), 500
    finally:
        if conn:
            conn.close()

@admin_bp.route('/api/statistics/recent_date')
@login_required
def get_recent_data_date():
    """
    가장 최근 접속 데이터가 있는 날짜를 반환합니다.
    """
    if 'mngr_sett' not in session.get('user', {}).get('permissions', []):
        return jsonify({'error': '권한이 없습니다.'}), 403
    conn = None

    try:
        conn = get_db_connection()
        analytics_dao = AnalyticsDAO(conn)

        # 가장 최근 데이터가 있는 날짜 조회
        recent_date = analytics_dao.get_most_recent_data_date()
        return jsonify({'recent_date': recent_date})

    except Exception as e:
        logging.error(f"Error fetching recent data date: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

@admin_bp.route('/api/statistics')
@login_required
def get_statistics():
    """
    기간별 통계 데이터를 반환합니다.
    """
    if 'mngr_sett' not in session.get('user', {}).get('permissions', []):
        return jsonify({'error': '권한이 없습니다.'}), 403
    view_type = request.args.get('view_type', 'daily')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    year = request.args.get('year')
    month = request.args.get('month')
    menu_nm = request.args.get('menu_nm', 'all') # menu_id 대신 menu_nm 사용
    conn = None

    try:
        conn = get_db_connection()
        analytics_dao = AnalyticsDAO(conn)
        
        if view_type == 'weekly_monthly':
            if not year:
                return jsonify({'error': 'Year is required for weekly/monthly view'}), 400
            
            # 메뉴별 주차 통계
            weekly_data = analytics_dao.get_menu_access_stats_weekly(year, menu_nm)
            # 전체 사이트 주차별 순 방문자 수
            site_unique_users = analytics_dao.get_total_unique_users_by_week(year)

            # 데이터 가공
            processed_data = {}
            for row in weekly_data:
                month = row['month']
                week = row['week_of_month']
                menu_name = row['menu_nm']
                
                if (month, week) not in processed_data:
                    processed_data[(month, week)] = {
                        'month': month,
                        'week': week,
                        'menus': [],
                        'site_unique_user_count': site_unique_users.get((month, week), 0)
                    }
                
                processed_data[(month, week)]['menus'].append({
                    'menu_nm': menu_name,
                    'total_access_count': row['total_access_count'],
                    'unique_user_count': row['unique_user_count']
                })
            
            # Sort by month and week
            sorted_data = sorted(processed_data.values(), key=lambda x: (x['month'], x['week']))
            
            # Get yearly total stats
            yearly_total = analytics_dao.get_yearly_total_stats(year, menu_nm)

            return jsonify({
                'weekly_stats': sorted_data,
                'yearly_chart_data': weekly_data,
                'yearly_total': yearly_total
            })

        elif view_type == 'comparison':
            if not year:
                return jsonify({'error': 'Year is required for comparison view'}), 400
            
            # 올해와 작년 데이터 가져오기
            this_year = int(year)
            last_year = this_year - 1

            # 올해 데이터
            this_year_weekly_data = analytics_dao.get_menu_access_stats_weekly(str(this_year), menu_nm)
            this_year_site_unique = analytics_dao.get_total_unique_users_by_week(str(this_year))
            this_year_processed = process_weekly_data(this_year_weekly_data, this_year_site_unique)
            this_year_total = analytics_dao.get_yearly_total_stats(str(this_year), menu_nm)

            # 작년 데이터
            last_year_weekly_data = analytics_dao.get_menu_access_stats_weekly(str(last_year), menu_nm)
            last_year_site_unique = analytics_dao.get_total_unique_users_by_week(str(last_year))
            last_year_processed = process_weekly_data(last_year_weekly_data, last_year_site_unique)
            last_year_total = analytics_dao.get_yearly_total_stats(str(last_year), menu_nm)

            return jsonify({
                'this_year_stats': this_year_processed,
                'last_year_stats': last_year_processed,
                'yearly_chart_data_this_year': this_year_weekly_data,
                'yearly_chart_data_last_year': last_year_weekly_data,
                'yearly_total': {
                    'this_year': this_year_total,
                    'last_year': last_year_total
                }
            })

        else: # daily view and other types
            params = {
                'view_type': view_type,
                'start_date': start_date,
                'end_date': end_date,
                'year': year,
                'month': month
            }
            menu_stats = analytics_dao.get_menu_access_stats(**params)
            total_stats = analytics_dao.get_total_access_stats(**params)
            
            return jsonify({
                'menu_access_stats': menu_stats,
                'total_access_stats': total_stats
            })

    except Exception as e:
        logging.error(f"Error fetching statistics: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

def process_weekly_data(weekly_data, site_unique_users):
    """Helper function to process raw weekly data into a structured format."""
    processed_data = {}
    for row in weekly_data:
        month = row['month']
        week = row['week_of_month']
        menu_name = row['menu_nm']
        
        if (month, week) not in processed_data:
            processed_data[(month, week)] = {
                'month': month,
                'week': week,
                'menus': [],
                'site_unique_user_count': site_unique_users.get((month, week), 0)
            }
        
        processed_data[(month, week)]['menus'].append({
            'menu_nm': menu_name,
            'total_access_count': row['total_access_count'],
            'unique_user_count': row['unique_user_count']
        })
    
    return sorted(processed_data.values(), key=lambda x: (x['month'], x['week']))

# @admin_bp.route('/api/statistics/excel_download')
# @login_required
# @admin_required
# def download_statistics_excel():
#     year = request.args.get('year')
#     menu_id = request.args.get('menu_id', 'all')
#     if not year:
#         return jsonify({'error': 'Year is required for Excel download'}), 400

#     conn = None
#     try:
#         conn = get_db_connection()
#         analytics_dao = AnalyticsDAO(conn)
#         weekly_data = analytics_dao.get_menu_access_stats_weekly(year, menu_id)

#         # Create Excel workbook
#         wb = openpyxl.Workbook()
#         ws = wb.active
#         ws.title = f"{year}년 주별-월별 접속 현황"

#         # Define styles
#         header_font = Font(bold=True, color="FFFFFF")
#         header_fill = PatternFill(start_color="4F81BD", end_color="4F81BD", fill_type="solid")
#         center_align = Alignment(horizontal='center', vertical='center')
#         border = Border(left=Side(style='thin'), right=Side(style='thin'), top=Side(style='thin'), bottom=Side(style='thin'))

#         # Header
#         headers = ['월', '주차', '메뉴', '접속 횟수', '순 방문자 수']
#         ws.append(headers)
#         for cell in ws[1]:
#             cell.font = header_font
#             cell.fill = header_fill
#             cell.alignment = center_align
#             cell.border = border

#         # Data processing
#         data_map = {}
#         all_menus = set()
#         for row in weekly_data:
#             m, w, menu_nm = row['month'], row['week_of_month'], row['menu_nm']
#             if (m, w) not in data_map:
#                 data_map[(m, w)] = {}
#             data_map[(m, w)][menu_nm] = (row['total_access_count'], row['unique_user_count'])
#             all_menus.add(menu_nm)
        
#         sorted_menus = sorted(list(all_menus))

#         # Populate data for all weeks and months
#         for month in range(1, 13):
#             month_total_access = 0
#             month_total_unique = 0
            
#             # Assuming max 5 weeks for simplicity
#             for week in range(1, 6):
#                 # Weekly data rows
#                 for menu_nm in sorted_menus:
#                     access_count, unique_count = data_map.get((month, week), {}).get(menu_nm, (0, 0))
#                     row_data = [f"{month}월" if week == 1 and menu_nm == sorted_menus[0] else "", 
#                                 f"{week}주" if menu_nm == sorted_menus[0] else "", 
#                                 menu_nm, access_count, unique_count]
#                     ws.append(row_data)
#                     month_total_access += access_count
#                     month_total_unique += unique_count

#             # Monthly total row
#             ws.append([f"{month}월 합계", "", "", month_total_access, month_total_unique])
#             # Apply styles to monthly total row
#             for cell in ws[ws.max_row]:
#                 cell.font = Font(bold=True)
#                 cell.fill = PatternFill(start_color="DCE6F1", end_color="DCE6F1", fill_type="solid")

#         # Auto-fit columns
#         for col in ws.columns:
#             max_length = 0
#             column = col[0].column_letter
#             for cell in col:
#                 try:
#                     if len(str(cell.value)) > max_length:
#                         max_length = len(str(cell.value))
#                 except:
#                     pass
#             adjusted_width = (max_length + 2)
#             ws.column_dimensions[column].width = adjusted_width

#         # Save to a memory buffer
#         buffer = BytesIO()
#         wb.save(buffer)
#         buffer.seek(0)

#         return send_file(
#             buffer,
#             as_attachment=True,
#             download_name=f'statistics_{year}.xlsx',
#             mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
#         )

#     except Exception as e:
#         logging.error(f"Error generating Excel file: {e}", exc_info=True)
#         return jsonify({'error': str(e)}), 500
#     finally:
#         if conn:
#             conn.close()

@admin_bp.route('/api/statistics/monthly_excel_download')
@login_required
def download_monthly_statistics_excel():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    if not start_date or not end_date:
        return jsonify({'error': 'start_date and end_date are required for Excel download'}), 400

    if 'mngr_sett' not in session.get('user', {}).get('permissions', []):
        return jsonify({'error': '권한이 없습니다.'}), 403
    conn = None
    try:
        conn = get_db_connection()
        analytics_dao = AnalyticsDAO(conn)
        monthly_data = analytics_dao.get_menu_access_stats_monthly(start_date, end_date)

        return jsonify(monthly_data)

    except Exception as e:
        logging.error(f"Error generating monthly Excel data: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

# Excel Template Management Routes
def get_excel_template_dir():
    """Get the Excel template directory path."""
    return os.path.join(current_app.static_folder, 'excel_templates')

def get_excel_template_path():
    """Get the Excel template file path."""
    return os.path.join(get_excel_template_dir(), 'excel_template.xlsx')

@admin_bp.route('/api/excel_template/upload', methods=['POST'])
@login_required
def upload_excel_template():
    """엑셀 템플릿 파일 업로드"""
    if 'mngr_sett' not in session.get('user', {}).get('permissions', []):
        return jsonify({'error': '권한이 없습니다.'}), 403

    if 'file' not in request.files:
        return jsonify({'error': '파일이 선택되지 않았습니다.'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '파일이 선택되지 않았습니다.'}), 400

    # 파일 타입 검증
    allowed_extensions = {'xlsx', 'xls'}
    if not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
        return jsonify({'error': '엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.'}), 400

    # 파일 크기 제한 (10MB)
    if len(file.read()) > 10 * 1024 * 1024:
        return jsonify({'error': '파일 크기는 10MB를 초과할 수 없습니다.'}), 400
    file.seek(0)  # 파일 포인터 리셋

    try:
        # 디렉토리 생성
        excel_template_dir = get_excel_template_dir()
        os.makedirs(excel_template_dir, exist_ok=True)

        # 기존 파일들을 legacy 폴더로 이동
        legacy_dir = os.path.join(excel_template_dir, 'legacy')
        os.makedirs(legacy_dir, exist_ok=True)

        import shutil
        from datetime import datetime

        for filename in os.listdir(excel_template_dir):
            if filename.endswith(('.xlsx', '.xls')) and filename != 'legacy':
                src_path = os.path.join(excel_template_dir, filename)
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                legacy_filename = f"{timestamp}_{filename}"
                dst_path = os.path.join(legacy_dir, legacy_filename)
                shutil.move(src_path, dst_path)
                current_app.logger.info(f"Moved existing file {filename} to legacy: {legacy_filename}")

        # 파일 저장 (원래 파일명으로)
        excel_template_path = os.path.join(excel_template_dir, file.filename)
        file.save(excel_template_path)

        return jsonify({
            'success': True,
            'message': '엑셀 템플릿이 성공적으로 업로드되었습니다.',
            'filename': file.filename
        })

    except Exception as e:
        logging.error(f"Error uploading Excel template: {e}", exc_info=True)
        return jsonify({'error': '파일 업로드 중 오류가 발생했습니다.'}), 500

    # 기존 코드 (주석처리)
    # try:
    #     # 디렉토리 생성
    #     excel_template_dir = get_excel_template_dir()
    #     os.makedirs(excel_template_dir, exist_ok=True)

    #     # 파일 저장 (항상 같은 이름으로 덮어쓰기)
    #     excel_template_path = get_excel_template_path()
    #     file.save(excel_template_path)

    #     return jsonify({
    #         'success': True,
    #         'message': '엑셀 템플릿이 성공적으로 업로드되었습니다.',
    #         'filename': 'excel_template.xlsx'
    #     })

    # except Exception as e:
    #     logging.error(f"Error uploading Excel template: {e}", exc_info=True)
    #     return jsonify({'error': '파일 업로드 중 오류가 발생했습니다.'}), 500

@admin_bp.route('/api/excel_template/info', methods=['GET'])
@login_required
def get_excel_template_info():
    """엑셀 템플릿 파일 정보 조회"""
    if 'mngr_sett' not in session.get('user', {}).get('permissions', []):
        return jsonify({'error': '권한이 없습니다.'}), 403

    try:
        excel_template_dir = get_excel_template_dir()

        # 폴더에서 엑셀 파일 찾기
        excel_files = [f for f in os.listdir(excel_template_dir) if f.endswith(('.xlsx', '.xls')) and f != 'legacy']
        if not excel_files:
            return jsonify({
                'exists': False,
                'message': '업로드된 엑셀 템플릿이 없습니다.'
            })

        # 가장 최근 파일 선택
        filename = excel_files[0]
        excel_template_path = os.path.join(excel_template_dir, filename)

        stat = os.stat(excel_template_path)
        file_size = stat.st_size
        modified_time = datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S')

        return jsonify({
            'exists': True,
            'filename': filename,
            'size': file_size,
            'modified': modified_time
        })

    except Exception as e:
        logging.error(f"Error getting Excel template info: {e}", exc_info=True)
        return jsonify({'error': '파일 정보 조회 중 오류가 발생했습니다.'}), 500

@admin_bp.route('/api/excel_template/download', methods=['GET'])
@login_required
def download_excel_template():
    """엑셀 템플릿 파일 다운로드"""

    try:
        excel_template_dir = get_excel_template_dir()

        # 폴더에서 엑셀 파일 찾기
        excel_files = [f for f in os.listdir(excel_template_dir) if f.endswith(('.xlsx', '.xls')) and f != 'legacy']
        if not excel_files:
            return jsonify({'error': '다운로드할 파일이 없습니다.'}), 404

        # 가장 최근 파일 선택 (여러 개일 경우)
        filename = excel_files[0]  # 현재는 하나만 있다고 가정
        excel_template_path = os.path.join(excel_template_dir, filename)

        current_app.logger.info(f"Excel template download - Found files: {excel_files}")
        current_app.logger.info(f"Excel template download - Selected file: {filename}")
        current_app.logger.info(f"Excel template download - File path: {excel_template_path}")
        current_app.logger.info(f"Excel template download - Download name: {filename}")

        response = send_file(
            excel_template_path,
            as_attachment=True,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

        # 한글 파일명 지원을 위한 Content-Disposition 헤더 설정
        quoted_filename = quote(filename)
        ascii_filename = filename.encode('ascii', 'ignore').decode('ascii')
        response.headers["Content-Disposition"] = f"attachment; filename*=UTF-8''{quoted_filename}; filename=\"{ascii_filename}\""
        current_app.logger.info(f"Excel template download - Original filename: {filename}")
        current_app.logger.info(f"Excel template download - Quoted filename: {quoted_filename}")
        current_app.logger.info(f"Excel template download - ASCII filename: {ascii_filename}")
        current_app.logger.info(f"Excel template download - Content-Disposition set to: {response.headers['Content-Disposition']}")

        return response

    except Exception as e:
        logging.error(f"Error downloading Excel template: {e}", exc_info=True)
        return jsonify({'error': '파일 다운로드 중 오류가 발생했습니다.'}), 500

    # 기존 코드 (주석처리)
    # try:
    #     excel_template_path = get_excel_template_path()
    #     if not os.path.exists(excel_template_path):
    #         return jsonify({'error': '다운로드할 파일이 없습니다.'}), 404

    #     return send_file(
    #         excel_template_path,
    #         as_attachment=True,
    #         download_name='excel_template.xlsx',
    #         mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    #     )

    # except Exception as e:
    #     logging.error(f"Error downloading Excel template: {e}", exc_info=True)
    #     return jsonify({'error': '파일 다운로드 중 오류가 발생했습니다.'}), 500

@admin_bp.route('/api/excel_template/delete', methods=['DELETE'])
@login_required
def delete_excel_template():
    """엑셀 템플릿 파일 삭제"""
    if 'mngr_sett' not in session.get('user', {}).get('permissions', []):
        return jsonify({'error': '권한이 없습니다.'}), 403

    try:
        excel_template_dir = get_excel_template_dir()

        # 폴더에서 엑셀 파일 찾기
        excel_files = [f for f in os.listdir(excel_template_dir) if f.endswith(('.xlsx', '.xls')) and f != 'legacy']
        if not excel_files:
            return jsonify({'error': '삭제할 파일이 없습니다.'}), 404

        # 가장 최근 파일 선택
        filename = excel_files[0]
        excel_template_path = os.path.join(excel_template_dir, filename)

        os.remove(excel_template_path)

        return jsonify({
            'success': True,
            'message': '엑셀 템플릿이 성공적으로 삭제되었습니다.'
        })

    except Exception as e:
        logging.error(f"Error deleting Excel template: {e}", exc_info=True)
        return jsonify({'error': '파일 삭제 중 오류가 발생했습니다.'}), 500
