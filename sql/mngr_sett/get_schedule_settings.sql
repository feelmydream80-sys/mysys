-- sql/mngr_sett/get_schedule_settings.sql
SELECT
    s.sett_id,
    s.grp_min_cnt,
    s.prgs_rt_red_thrsval,
    s.prgs_rt_org_thrsval,
    s.use_yn,
    s.grp_brdr_styl,
    s.grp_colr_crtr,
    s.succ_rt_red_thrsval,
    s.succ_rt_org_thrsval,
    s.memo_bg_colr,
    s.memo_txt_colr
FROM
    tb_data_clt_schd_sett s
ORDER BY
    s.sett_id DESC
LIMIT 1;