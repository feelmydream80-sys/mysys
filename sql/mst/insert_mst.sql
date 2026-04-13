INSERT INTO tb_con_mst (cd_cl, cd, cd_nm, cd_desc, item1, item2, item3, item4, item5, item6, item7, item8, item9, item10, use_yn, update_dt)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Y', NOW() AT TIME ZONE 'Asia/Seoul');
