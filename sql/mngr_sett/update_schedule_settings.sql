-- sql/mngr_sett/update_schedule_settings.sql
UPDATE
    tb_data_clt_schd_sett
SET
    grp_min_cnt = %(grp_min_cnt)s,
    prgs_rt_red_thrsval = %(prgs_rt_red_thrsval)s,
    prgs_rt_org_thrsval = %(prgs_rt_org_thrsval)s,
    use_yn = %(use_yn)s,
    grp_brdr_styl = %(grp_brdr_styl)s,
    grp_colr_crtr = %(grp_colr_crtr)s,
    succ_rt_red_thrsval = %(succ_rt_red_thrsval)s,
    succ_rt_org_thrsval = %(succ_rt_org_thrsval)s,
    grp_prgs_icon_id = %(grp_prgs_icon_id)s,
    grp_sucs_icon_id = %(grp_sucs_icon_id)s,
    updr_id = %(updr_id)s,
    upd_dt = CURRENT_TIMESTAMP
WHERE
    sett_id = %(sett_id)s;