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
    s.grp_prgs_icon_id,
    grp_prgs_icon.icon_cd AS grp_prgs_icon_cd,
    s.grp_sucs_icon_id,
    grp_sucs_icon.icon_cd AS grp_sucs_icon_cd
FROM
    tb_data_clt_schd_sett s
LEFT JOIN tb_icon grp_prgs_icon ON s.grp_prgs_icon_id = grp_prgs_icon.icon_id
LEFT JOIN tb_icon grp_sucs_icon ON s.grp_sucs_icon_id = grp_sucs_icon.icon_id
ORDER BY
    s.sett_id DESC
LIMIT 1;