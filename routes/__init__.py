# routes/__init__.py

def init_app(app):
    from . import auth_routes
    from . import data_spec_routes
    from . import jandi_routes
    from . import mngr_sett_routes
    from . import analysis_routes
    from .api import api_bp, dashboard_api
    from .api.analysis_api import analysis_api_bp
    from .api.auth_api import auth_api_bp
    from .api.card_summary_api import card_summary_api_bp
    from .api.data_definition_api import bp as data_definition_api_bp
    from .api.api_key_mngr_routes import api_key_mngr_api
    from .api.popup_routes import popup_api_bp
    from .ui import dashboard_routes, collection_schedule_routes, api_key_mngr_routes
    from . import mapping_routes
    from . import admin_routes
    from . import card_summary_routes
    from . import data_report_routes
    from . import today_routes

    app.register_blueprint(auth_routes.auth_bp)
    app.register_blueprint(auth_api_bp)
    app.register_blueprint(data_spec_routes.bp)
    app.register_blueprint(jandi_routes.bp)
    app.register_blueprint(mngr_sett_routes.mngr_sett_bp)
    app.register_blueprint(mngr_sett_routes.api_mngr_sett_bp)
    app.register_blueprint(analysis_routes.analysis_bp)
    app.register_blueprint(analysis_api_bp)
    app.register_blueprint(card_summary_api_bp)
    app.register_blueprint(api_bp)
    app.register_blueprint(dashboard_routes.dashboard_bp)
    app.register_blueprint(dashboard_api.dashboard_api_bp)
    app.register_blueprint(collection_schedule_routes.collection_schedule_bp)
    app.register_blueprint(mapping_routes.mapping_bp)
    app.register_blueprint(admin_routes.admin_bp)
    app.register_blueprint(card_summary_routes.card_summary_bp)
    app.register_blueprint(data_report_routes.data_report_bp)
    app.register_blueprint(today_routes.today_bp)
    app.register_blueprint(data_definition_api_bp)
    app.register_blueprint(api_key_mngr_api)
    app.register_blueprint(api_key_mngr_routes.api_key_mngr_ui)
    app.register_blueprint(popup_api_bp)
