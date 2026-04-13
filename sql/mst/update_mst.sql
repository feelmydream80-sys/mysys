UPDATE tb_con_mst
SET cd_nm = %s, cd_desc = %s, item1 = %s, item2 = %s, item3 = %s, item4 = %s, item5 = %s, item6 = %s, item7 = %s, item8 = %s, item9 = %s, item10 = %s, use_yn = %s, update_dt = NOW() AT TIME ZONE 'Asia/Seoul'
WHERE cd_cl = %s AND cd = %s;
