from flask import Blueprint, render_template
from datetime import datetime
from ..auth_routes import login_required, check_password_change_required
from .dashboard_routes import log_menu_access

api_key_mngr_ui = Blueprint('api_key_mngr', __name__)

@api_key_mngr_ui.route('/api_key_mngr')
@login_required
@check_password_change_required
@log_menu_access
def index():
    """API 키 관리 페이지"""
    current_date = datetime.now().strftime('%Y-%m-%d')
    return render_template('api_key_mngr.html', current_date=current_date)