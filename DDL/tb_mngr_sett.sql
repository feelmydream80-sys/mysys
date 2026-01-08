-- Table: public.tb_mngr_sett

-- DROP TABLE IF EXISTS public.tb_mngr_sett;

CREATE TABLE IF NOT EXISTS public.tb_mngr_sett
(
    cd character varying(50) COLLATE pg_catalog."default" NOT NULL,
    cnn_failr_thrs_val integer DEFAULT 3,
    cnn_warn_thrs_val integer DEFAULT 2,
    cnn_failr_icon_id integer,
    cnn_failr_wrd_colr character varying(7) COLLATE pg_catalog."default" DEFAULT '#dc3545'::character varying,
    cnn_warn_icon_id integer,
    cnn_warn_wrd_colr character varying(7) COLLATE pg_catalog."default" DEFAULT '#ffc107'::character varying,
    cnn_sucs_icon_id integer,
    cnn_sucs_wrd_colr character varying(7) COLLATE pg_catalog."default" DEFAULT '#28a745'::character varying,
    dly_sucs_rt_thrs_val integer DEFAULT 80,
    dd7_sucs_rt_thrs_val integer DEFAULT 75,
    mthl_sucs_rt_thrs_val integer DEFAULT 70,
    mc6_sucs_rt_thrs_val integer DEFAULT 65,
    yy1_sucs_rt_thrs_val integer DEFAULT 60,
    sucs_rt_sucs_icon_id integer,
    sucs_rt_sucs_wrd_colr character varying(7) COLLATE pg_catalog."default" DEFAULT '#28a745'::character varying,
    sucs_rt_warn_icon_id integer,
    sucs_rt_warn_wrd_colr character varying(7) COLLATE pg_catalog."default" DEFAULT '#ffc107'::character varying,
    chrt_prd_value integer DEFAULT 1,
    chrt_tp character varying(20) COLLATE pg_catalog."default" DEFAULT 'line'::character varying,
    chrt_dsp_job_id text COLLATE pg_catalog."default",
    chrt_dsp_yn boolean DEFAULT true,
    chrt_colr character varying(7) COLLATE pg_catalog."default" DEFAULT '#42A5F5'::character varying,
    grass_chrt_min_colr character varying(7) COLLATE pg_catalog."default" DEFAULT '#9be9a8'::character varying,
    grass_chrt_max_colr character varying(7) COLLATE pg_catalog."default" DEFAULT '#216e39'::character varying,
    CONSTRAINT tb_admin_settings_pkey PRIMARY KEY (cd)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.tb_mngr_sett
    OWNER to etl_user;
