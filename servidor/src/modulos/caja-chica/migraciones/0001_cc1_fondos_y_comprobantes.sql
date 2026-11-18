CREATE TABLE "caja_chica"."accesos_a_fondos" (
	"empresa_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"fondo_id" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "accesos_a_fondos_empresa_id_usuario_id_fondo_id_pk" PRIMARY KEY("empresa_id","usuario_id","fondo_id")
);
--> statement-breakpoint
ALTER TABLE "caja_chica"."accesos_a_fondos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "caja_chica"."arqueos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"fondo_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"anio_de_numero" integer DEFAULT 0 NOT NULL,
	"realizado_en" timestamp with time zone NOT NULL,
	"arqueado_por" uuid NOT NULL,
	"custodio" text NOT NULL,
	"custodio_usuario_id" uuid,
	"lo_hizo_el_custodio" boolean DEFAULT false NOT NULL,
	"conteo" jsonb NOT NULL,
	"efectivo_contado" numeric(14, 2) NOT NULL,
	"valores_por_cambiar" numeric(14, 2) DEFAULT '0' NOT NULL,
	"monto_del_fondo" numeric(14, 2) NOT NULL,
	"pendiente_de_reponer" numeric(14, 2) NOT NULL,
	"vales_abiertos" numeric(14, 2) NOT NULL,
	"efectivo_esperado" numeric(14, 2) NOT NULL,
	"diferencia" numeric(14, 2) NOT NULL,
	"comprobantes_completos" boolean NOT NULL,
	"motivo_de_diferencia" text,
	"observaciones" text,
	"estado" text DEFAULT 'vigente' NOT NULL,
	"fecha_de_anulacion" date,
	"anulado_en" timestamp with time zone,
	"anulado_por" uuid,
	"motivo_de_anulacion" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "arqueos_numero_unico" UNIQUE("empresa_id","anio_de_numero","numero"),
	CONSTRAINT "arqueos_llave_unica" UNIQUE("id","empresa_id","fondo_id"),
	CONSTRAINT "arqueos_numero_positivo" CHECK ("caja_chica"."arqueos"."numero" > 0),
	CONSTRAINT "arqueos_custodio_valido" CHECK ("caja_chica"."arqueos"."custodio" is not null and ("caja_chica"."arqueos"."custodio" is null or (char_length("caja_chica"."arqueos"."custodio") between 1 and 150 and "caja_chica"."arqueos"."custodio" = btrim("caja_chica"."arqueos"."custodio")))),
	CONSTRAINT "arqueos_conteo_es_arreglo" CHECK (jsonb_typeof("caja_chica"."arqueos"."conteo") = 'array'),
	CONSTRAINT "arqueos_montos_validos" CHECK ("caja_chica"."arqueos"."efectivo_contado" >= 0 and "caja_chica"."arqueos"."valores_por_cambiar" >= 0),
	CONSTRAINT "arqueos_fondo_y_vales_validos" CHECK ("caja_chica"."arqueos"."monto_del_fondo" >= 0 and "caja_chica"."arqueos"."vales_abiertos" >= 0),
	CONSTRAINT "arqueos_observaciones_validas" CHECK (("caja_chica"."arqueos"."observaciones" is null or (char_length("caja_chica"."arqueos"."observaciones") between 1 and 500 and "caja_chica"."arqueos"."observaciones" = btrim("caja_chica"."arqueos"."observaciones")))),
	CONSTRAINT "arqueos_efectivo_esperado_cuadra" CHECK ("caja_chica"."arqueos"."efectivo_esperado" = "caja_chica"."arqueos"."monto_del_fondo" - "caja_chica"."arqueos"."pendiente_de_reponer" - "caja_chica"."arqueos"."vales_abiertos"),
	CONSTRAINT "arqueos_diferencia_cuadra" CHECK ("caja_chica"."arqueos"."diferencia" = "caja_chica"."arqueos"."efectivo_contado" + "caja_chica"."arqueos"."valores_por_cambiar" - "caja_chica"."arqueos"."efectivo_esperado"),
	CONSTRAINT "arqueos_motivo_de_diferencia" CHECK (("caja_chica"."arqueos"."diferencia" <> 0) = ("caja_chica"."arqueos"."motivo_de_diferencia" is not null)),
	CONSTRAINT "arqueos_motivo_de_diferencia_rango" CHECK (("caja_chica"."arqueos"."motivo_de_diferencia" is null or (char_length("caja_chica"."arqueos"."motivo_de_diferencia") between 1 and 300 and "caja_chica"."arqueos"."motivo_de_diferencia" = btrim("caja_chica"."arqueos"."motivo_de_diferencia")))),
	CONSTRAINT "arqueos_estado_valido" CHECK ("caja_chica"."arqueos"."estado" in ('vigente', 'anulado')),
	CONSTRAINT "arqueos_anulacion_completa" CHECK (("caja_chica"."arqueos"."estado" = 'anulado') = ("caja_chica"."arqueos"."anulado_en" is not null) and ("caja_chica"."arqueos"."anulado_en" is not null) = ("caja_chica"."arqueos"."anulado_por" is not null) and ("caja_chica"."arqueos"."anulado_por" is not null) = ("caja_chica"."arqueos"."motivo_de_anulacion" is not null)),
	CONSTRAINT "arqueos_motivo_de_anulacion_rango" CHECK ("caja_chica"."arqueos"."motivo_de_anulacion" is null or char_length("caja_chica"."arqueos"."motivo_de_anulacion") between 1 and 300),
	CONSTRAINT "arqueos_fecha_de_anulacion_de_su_estado" CHECK (("caja_chica"."arqueos"."estado" = 'anulado') = ("caja_chica"."arqueos"."fecha_de_anulacion" is not null))
);
--> statement-breakpoint
ALTER TABLE "caja_chica"."arqueos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "caja_chica"."cambios_de_monto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"fondo_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"forma" text NOT NULL,
	"fecha" date NOT NULL,
	"monto" numeric(14, 2) NOT NULL,
	"movimiento_id" uuid,
	"estado" text DEFAULT 'vigente' NOT NULL,
	"fecha_de_anulacion" date,
	"anulado_en" timestamp with time zone,
	"anulado_por" uuid,
	"motivo_de_anulacion" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "cambios_tipo_valido" CHECK ("caja_chica"."cambios_de_monto"."tipo" in ('apertura', 'aumento', 'disminucion', 'cierre')),
	CONSTRAINT "cambios_forma_valida" CHECK ("caja_chica"."cambios_de_monto"."forma" in ('cheque', 'nota_de_debito', 'nota_de_credito', 'saldo_inicial', 'sin_deposito')),
	CONSTRAINT "cambios_tipo_y_forma" CHECK (("caja_chica"."cambios_de_monto"."tipo" = 'apertura' and "caja_chica"."cambios_de_monto"."forma" in ('cheque', 'nota_de_debito', 'saldo_inicial'))
      or ("caja_chica"."cambios_de_monto"."tipo" = 'aumento' and "caja_chica"."cambios_de_monto"."forma" in ('cheque', 'nota_de_debito'))
      or ("caja_chica"."cambios_de_monto"."tipo" = 'disminucion' and "caja_chica"."cambios_de_monto"."forma" = 'nota_de_credito')
      or ("caja_chica"."cambios_de_monto"."tipo" = 'cierre' and "caja_chica"."cambios_de_monto"."forma" in ('nota_de_credito', 'sin_deposito'))),
	CONSTRAINT "cambios_monto_valido" CHECK (case when "caja_chica"."cambios_de_monto"."tipo" = 'cierre' then "caja_chica"."cambios_de_monto"."monto" >= 0 else "caja_chica"."cambios_de_monto"."monto" > 0 end),
	CONSTRAINT "cambios_sin_deposito_es_cero" CHECK (("caja_chica"."cambios_de_monto"."forma" = 'sin_deposito') = ("caja_chica"."cambios_de_monto"."tipo" = 'cierre' and "caja_chica"."cambios_de_monto"."monto" = 0)),
	CONSTRAINT "cambios_movimiento_de_su_forma" CHECK (("caja_chica"."cambios_de_monto"."forma" in ('saldo_inicial', 'sin_deposito')) = ("caja_chica"."cambios_de_monto"."movimiento_id" is null)),
	CONSTRAINT "cambios_estado_valido" CHECK ("caja_chica"."cambios_de_monto"."estado" in ('vigente', 'anulado')),
	CONSTRAINT "cambios_anulacion_completa" CHECK (("caja_chica"."cambios_de_monto"."estado" = 'anulado') = ("caja_chica"."cambios_de_monto"."anulado_en" is not null) and ("caja_chica"."cambios_de_monto"."anulado_en" is not null) = ("caja_chica"."cambios_de_monto"."anulado_por" is not null) and ("caja_chica"."cambios_de_monto"."anulado_por" is not null) = ("caja_chica"."cambios_de_monto"."motivo_de_anulacion" is not null)),
	CONSTRAINT "cambios_motivo_de_anulacion_rango" CHECK ("caja_chica"."cambios_de_monto"."motivo_de_anulacion" is null or char_length("caja_chica"."cambios_de_monto"."motivo_de_anulacion") between 1 and 300),
	CONSTRAINT "cambios_fecha_de_anulacion_de_su_estado" CHECK (("caja_chica"."cambios_de_monto"."estado" = 'anulado') = ("caja_chica"."cambios_de_monto"."fecha_de_anulacion" is not null)),
	CONSTRAINT "cambios_fecha_de_anulacion_valida" CHECK ("caja_chica"."cambios_de_monto"."fecha_de_anulacion" is null or "caja_chica"."cambios_de_monto"."fecha_de_anulacion" >= "caja_chica"."cambios_de_monto"."fecha")
);
--> statement-breakpoint
ALTER TABLE "caja_chica"."cambios_de_monto" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "caja_chica"."comprobantes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"fondo_id" uuid,
	"clase" text NOT NULL,
	"documento_de_compra_id" uuid,
	"resta" boolean DEFAULT false NOT NULL,
	"es_nota_de_credito" boolean DEFAULT false NOT NULL,
	"documento_afectado_id" uuid,
	"proveedor_id" uuid,
	"fecha" date NOT NULL,
	"monto" numeric(14, 2) NOT NULL,
	"con_activo_fijo" boolean DEFAULT false NOT NULL,
	"numero" integer,
	"anio_de_numero" integer DEFAULT 0 NOT NULL,
	"descripcion" text,
	"pagado_a" text,
	"concepto_de_gasto_id" uuid,
	"motivo_sin_documento" text,
	"sobre_el_tope" boolean DEFAULT false NOT NULL,
	"motivo_sobre_el_tope" text,
	"sin_bancarizar" boolean DEFAULT false NOT NULL,
	"motivo_sin_bancarizar" text,
	"arqueo_id" uuid,
	"destino_del_faltante" text,
	"vale_provisional_id" uuid,
	"asignado_en" timestamp with time zone,
	"asignado_por" uuid,
	"estado" text DEFAULT 'vigente' NOT NULL,
	"fecha_de_anulacion" date,
	"anulado_en" timestamp with time zone,
	"anulado_por" uuid,
	"motivo_de_anulacion" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "comprobantes_llave_unica" UNIQUE("id","empresa_id","fondo_id"),
	CONSTRAINT "comprobantes_clase_valida" CHECK ("caja_chica"."comprobantes"."clase" in ('documento', 'vale_de_gasto', 'faltante', 'sobrante')),
	CONSTRAINT "comprobantes_clase_exige_fondo" CHECK ("caja_chica"."comprobantes"."clase" = 'documento' or "caja_chica"."comprobantes"."fondo_id" is not null),
	CONSTRAINT "comprobantes_documento_de_su_clase" CHECK (("caja_chica"."comprobantes"."clase" = 'documento') = ("caja_chica"."comprobantes"."documento_de_compra_id" is not null)),
	CONSTRAINT "comprobantes_documento_con_proveedor" CHECK ("caja_chica"."comprobantes"."clase" <> 'documento' or "caja_chica"."comprobantes"."proveedor_id" is not null),
	CONSTRAINT "comprobantes_monto_positivo" CHECK ("caja_chica"."comprobantes"."monto" > 0),
	CONSTRAINT "comprobantes_resta_coherente" CHECK ("caja_chica"."comprobantes"."resta" = ("caja_chica"."comprobantes"."clase" = 'sobrante' or "caja_chica"."comprobantes"."es_nota_de_credito")),
	CONSTRAINT "comprobantes_nota_solo_en_documentos" CHECK (not "caja_chica"."comprobantes"."es_nota_de_credito" or "caja_chica"."comprobantes"."clase" = 'documento'),
	CONSTRAINT "comprobantes_afectado_solo_en_notas" CHECK ("caja_chica"."comprobantes"."documento_afectado_id" is null or "caja_chica"."comprobantes"."es_nota_de_credito"),
	CONSTRAINT "comprobantes_arqueo_de_su_clase" CHECK (("caja_chica"."comprobantes"."clase" in ('faltante', 'sobrante')) = ("caja_chica"."comprobantes"."arqueo_id" is not null)),
	CONSTRAINT "comprobantes_destino_del_faltante" CHECK (("caja_chica"."comprobantes"."clase" = 'faltante') = ("caja_chica"."comprobantes"."destino_del_faltante" is not null) and ("caja_chica"."comprobantes"."destino_del_faltante" is null or "caja_chica"."comprobantes"."destino_del_faltante" in ('perdida', 'cobrar_al_custodio'))),
	CONSTRAINT "comprobantes_vale_provisional_valido" CHECK ("caja_chica"."comprobantes"."vale_provisional_id" is null or ("caja_chica"."comprobantes"."clase" in ('documento', 'vale_de_gasto') and "caja_chica"."comprobantes"."fondo_id" is not null)),
	CONSTRAINT "comprobantes_numero_de_su_clase" CHECK (("caja_chica"."comprobantes"."clase" = 'vale_de_gasto') = ("caja_chica"."comprobantes"."numero" is not null)),
	CONSTRAINT "comprobantes_numero_positivo" CHECK ("caja_chica"."comprobantes"."numero" is null or "caja_chica"."comprobantes"."numero" > 0),
	CONSTRAINT "comprobantes_descripcion_obligatoria" CHECK ("caja_chica"."comprobantes"."clase" = 'documento' or "caja_chica"."comprobantes"."descripcion" is not null),
	CONSTRAINT "comprobantes_descripcion_valida" CHECK (("caja_chica"."comprobantes"."descripcion" is null or (char_length("caja_chica"."comprobantes"."descripcion") between 1 and 300 and "caja_chica"."comprobantes"."descripcion" = btrim("caja_chica"."comprobantes"."descripcion")))),
	CONSTRAINT "comprobantes_pagado_a_de_su_clase" CHECK (("caja_chica"."comprobantes"."clase" = 'vale_de_gasto') = ("caja_chica"."comprobantes"."pagado_a" is not null)),
	CONSTRAINT "comprobantes_pagado_a_valido" CHECK (("caja_chica"."comprobantes"."pagado_a" is null or (char_length("caja_chica"."comprobantes"."pagado_a") between 1 and 150 and "caja_chica"."comprobantes"."pagado_a" = btrim("caja_chica"."comprobantes"."pagado_a")))),
	CONSTRAINT "comprobantes_concepto_del_vale" CHECK ("caja_chica"."comprobantes"."clase" <> 'vale_de_gasto' or "caja_chica"."comprobantes"."concepto_de_gasto_id" is not null),
	CONSTRAINT "comprobantes_motivo_sin_documento_de_su_clase" CHECK (("caja_chica"."comprobantes"."clase" = 'vale_de_gasto') = ("caja_chica"."comprobantes"."motivo_sin_documento" is not null)),
	CONSTRAINT "comprobantes_motivo_sin_documento_rango" CHECK (("caja_chica"."comprobantes"."motivo_sin_documento" is null or (char_length("caja_chica"."comprobantes"."motivo_sin_documento") between 1 and 300 and "caja_chica"."comprobantes"."motivo_sin_documento" = btrim("caja_chica"."comprobantes"."motivo_sin_documento")))),
	CONSTRAINT "comprobantes_tope_con_motivo" CHECK ("caja_chica"."comprobantes"."sobre_el_tope" = ("caja_chica"."comprobantes"."motivo_sobre_el_tope" is not null)),
	CONSTRAINT "comprobantes_motivo_sobre_el_tope_rango" CHECK (("caja_chica"."comprobantes"."motivo_sobre_el_tope" is null or (char_length("caja_chica"."comprobantes"."motivo_sobre_el_tope") between 1 and 300 and "caja_chica"."comprobantes"."motivo_sobre_el_tope" = btrim("caja_chica"."comprobantes"."motivo_sobre_el_tope")))),
	CONSTRAINT "comprobantes_motivo_sin_bancarizar_solo_marcado" CHECK ("caja_chica"."comprobantes"."motivo_sin_bancarizar" is null or "caja_chica"."comprobantes"."sin_bancarizar"),
	CONSTRAINT "comprobantes_motivo_sin_bancarizar_rango" CHECK (("caja_chica"."comprobantes"."motivo_sin_bancarizar" is null or (char_length("caja_chica"."comprobantes"."motivo_sin_bancarizar") between 1 and 300 and "caja_chica"."comprobantes"."motivo_sin_bancarizar" = btrim("caja_chica"."comprobantes"."motivo_sin_bancarizar")))),
	CONSTRAINT "comprobantes_asignacion_completa" CHECK (("caja_chica"."comprobantes"."fondo_id" is null) = ("caja_chica"."comprobantes"."asignado_en" is null) and ("caja_chica"."comprobantes"."asignado_en" is null) = ("caja_chica"."comprobantes"."asignado_por" is null)),
	CONSTRAINT "comprobantes_estado_valido" CHECK ("caja_chica"."comprobantes"."estado" in ('vigente', 'anulado')),
	CONSTRAINT "comprobantes_anulacion_completa" CHECK (("caja_chica"."comprobantes"."estado" = 'anulado') = ("caja_chica"."comprobantes"."anulado_en" is not null) and ("caja_chica"."comprobantes"."anulado_en" is not null) = ("caja_chica"."comprobantes"."anulado_por" is not null) and ("caja_chica"."comprobantes"."anulado_por" is not null) = ("caja_chica"."comprobantes"."motivo_de_anulacion" is not null)),
	CONSTRAINT "comprobantes_motivo_de_anulacion_rango" CHECK ("caja_chica"."comprobantes"."motivo_de_anulacion" is null or char_length("caja_chica"."comprobantes"."motivo_de_anulacion") between 1 and 300),
	CONSTRAINT "comprobantes_fecha_de_anulacion_de_su_estado" CHECK (("caja_chica"."comprobantes"."estado" = 'anulado') = ("caja_chica"."comprobantes"."fecha_de_anulacion" is not null)),
	CONSTRAINT "comprobantes_fecha_de_anulacion_valida" CHECK ("caja_chica"."comprobantes"."fecha_de_anulacion" is null or "caja_chica"."comprobantes"."fecha_de_anulacion" >= "caja_chica"."comprobantes"."fecha")
);
--> statement-breakpoint
ALTER TABLE "caja_chica"."comprobantes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "caja_chica"."custodios_de_fondos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"fondo_id" uuid NOT NULL,
	"custodio" text NOT NULL,
	"custodio_usuario_id" uuid,
	"desde" date NOT NULL,
	"hasta" date,
	"motivo_del_cambio" text,
	"arqueo_de_entrega_id" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "custodios_custodio_valido" CHECK ("caja_chica"."custodios_de_fondos"."custodio" is not null and ("caja_chica"."custodios_de_fondos"."custodio" is null or (char_length("caja_chica"."custodios_de_fondos"."custodio") between 1 and 150 and "caja_chica"."custodios_de_fondos"."custodio" = btrim("caja_chica"."custodios_de_fondos"."custodio")))),
	CONSTRAINT "custodios_periodo_valido" CHECK ("caja_chica"."custodios_de_fondos"."hasta" is null or "caja_chica"."custodios_de_fondos"."hasta" >= "caja_chica"."custodios_de_fondos"."desde"),
	CONSTRAINT "custodios_motivo_valido" CHECK (("caja_chica"."custodios_de_fondos"."motivo_del_cambio" is null or (char_length("caja_chica"."custodios_de_fondos"."motivo_del_cambio") between 1 and 300 and "caja_chica"."custodios_de_fondos"."motivo_del_cambio" = btrim("caja_chica"."custodios_de_fondos"."motivo_del_cambio"))))
);
--> statement-breakpoint
ALTER TABLE "caja_chica"."custodios_de_fondos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "caja_chica"."fondos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"localidad_id" uuid,
	"tope_por_comprobante" numeric(14, 2),
	"cuenta_bancaria_id" uuid,
	"origen" text DEFAULT 'banco' NOT NULL,
	"fecha_de_apertura" date NOT NULL,
	"estado" text DEFAULT 'abierto' NOT NULL,
	"fecha_de_cierre" date,
	"cerrado_en" timestamp with time zone,
	"cerrado_por" uuid,
	"motivo_de_cierre" text,
	"observaciones" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "fondos_id_empresa_unico" UNIQUE("id","empresa_id"),
	CONSTRAINT "fondos_nombre_valido" CHECK ("caja_chica"."fondos"."nombre" is not null and ("caja_chica"."fondos"."nombre" is null or (char_length("caja_chica"."fondos"."nombre") between 1 and 80 and "caja_chica"."fondos"."nombre" = btrim("caja_chica"."fondos"."nombre")))),
	CONSTRAINT "fondos_tope_positivo" CHECK ("caja_chica"."fondos"."tope_por_comprobante" is null or "caja_chica"."fondos"."tope_por_comprobante" > 0),
	CONSTRAINT "fondos_origen_valido" CHECK ("caja_chica"."fondos"."origen" in ('banco', 'saldo_inicial')),
	CONSTRAINT "fondos_observaciones_validas" CHECK (("caja_chica"."fondos"."observaciones" is null or (char_length("caja_chica"."fondos"."observaciones") between 1 and 500 and "caja_chica"."fondos"."observaciones" = btrim("caja_chica"."fondos"."observaciones")))),
	CONSTRAINT "fondos_estado_valido" CHECK ("caja_chica"."fondos"."estado" in ('abierto', 'cerrado')),
	CONSTRAINT "fondos_cierre_completo" CHECK (("caja_chica"."fondos"."estado" = 'cerrado') = ("caja_chica"."fondos"."fecha_de_cierre" is not null) and ("caja_chica"."fondos"."fecha_de_cierre" is not null) = ("caja_chica"."fondos"."cerrado_en" is not null) and ("caja_chica"."fondos"."cerrado_en" is not null) = ("caja_chica"."fondos"."cerrado_por" is not null) and ("caja_chica"."fondos"."cerrado_por" is not null) = ("caja_chica"."fondos"."motivo_de_cierre" is not null)),
	CONSTRAINT "fondos_motivo_de_cierre_rango" CHECK (("caja_chica"."fondos"."motivo_de_cierre" is null or (char_length("caja_chica"."fondos"."motivo_de_cierre") between 1 and 300 and "caja_chica"."fondos"."motivo_de_cierre" = btrim("caja_chica"."fondos"."motivo_de_cierre")))),
	CONSTRAINT "fondos_fecha_de_cierre_valida" CHECK ("caja_chica"."fondos"."fecha_de_cierre" is null or "caja_chica"."fondos"."fecha_de_cierre" >= "caja_chica"."fondos"."fecha_de_apertura")
);
--> statement-breakpoint
ALTER TABLE "caja_chica"."fondos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "caja_chica"."reposicion_comprobantes" (
	"reposicion_id" uuid NOT NULL,
	"comprobante_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"fondo_id" uuid NOT NULL,
	"monto" numeric(14, 2) NOT NULL,
	"vigente" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "reposicion_comprobantes_reposicion_id_comprobante_id_pk" PRIMARY KEY("reposicion_id","comprobante_id"),
	CONSTRAINT "reposicion_comprobantes_monto_no_cero" CHECK ("caja_chica"."reposicion_comprobantes"."monto" <> 0)
);
--> statement-breakpoint
ALTER TABLE "caja_chica"."reposicion_comprobantes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "caja_chica"."reposiciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"fondo_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"anio_de_numero" integer DEFAULT 0 NOT NULL,
	"fecha" date NOT NULL,
	"forma" text NOT NULL,
	"monto" numeric(14, 2) NOT NULL,
	"movimiento_id" uuid,
	"custodio" text NOT NULL,
	"la_hizo_el_custodio" boolean DEFAULT false NOT NULL,
	"estado" text DEFAULT 'vigente' NOT NULL,
	"fecha_de_anulacion" date,
	"anulado_en" timestamp with time zone,
	"anulado_por" uuid,
	"motivo_de_anulacion" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "reposiciones_numero_unico" UNIQUE("empresa_id","anio_de_numero","numero"),
	CONSTRAINT "reposiciones_llave_unica" UNIQUE("id","empresa_id","fondo_id"),
	CONSTRAINT "reposiciones_numero_positivo" CHECK ("caja_chica"."reposiciones"."numero" > 0),
	CONSTRAINT "reposiciones_forma_valida" CHECK ("caja_chica"."reposiciones"."forma" in ('cheque', 'nota_de_debito', 'compensada_al_cerrar')),
	CONSTRAINT "reposiciones_monto_positivo" CHECK ("caja_chica"."reposiciones"."monto" > 0),
	CONSTRAINT "reposiciones_movimiento_de_su_forma" CHECK (("caja_chica"."reposiciones"."forma" = 'compensada_al_cerrar') = ("caja_chica"."reposiciones"."movimiento_id" is null)),
	CONSTRAINT "reposiciones_custodio_valido" CHECK ("caja_chica"."reposiciones"."custodio" is not null and ("caja_chica"."reposiciones"."custodio" is null or (char_length("caja_chica"."reposiciones"."custodio") between 1 and 150 and "caja_chica"."reposiciones"."custodio" = btrim("caja_chica"."reposiciones"."custodio")))),
	CONSTRAINT "reposiciones_estado_valido" CHECK ("caja_chica"."reposiciones"."estado" in ('vigente', 'anulada')),
	CONSTRAINT "reposiciones_anulacion_completa" CHECK (("caja_chica"."reposiciones"."estado" = 'anulada') = ("caja_chica"."reposiciones"."anulado_en" is not null) and ("caja_chica"."reposiciones"."anulado_en" is not null) = ("caja_chica"."reposiciones"."anulado_por" is not null) and ("caja_chica"."reposiciones"."anulado_por" is not null) = ("caja_chica"."reposiciones"."motivo_de_anulacion" is not null)),
	CONSTRAINT "reposiciones_motivo_de_anulacion_rango" CHECK ("caja_chica"."reposiciones"."motivo_de_anulacion" is null or char_length("caja_chica"."reposiciones"."motivo_de_anulacion") between 1 and 300),
	CONSTRAINT "reposiciones_fecha_de_anulacion_de_su_estado" CHECK (("caja_chica"."reposiciones"."estado" = 'anulada') = ("caja_chica"."reposiciones"."fecha_de_anulacion" is not null)),
	CONSTRAINT "reposiciones_fecha_de_anulacion_valida" CHECK ("caja_chica"."reposiciones"."fecha_de_anulacion" is null or "caja_chica"."reposiciones"."fecha_de_anulacion" >= "caja_chica"."reposiciones"."fecha")
);
--> statement-breakpoint
ALTER TABLE "caja_chica"."reposiciones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "caja_chica"."vales_provisionales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"fondo_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"anio_de_numero" integer DEFAULT 0 NOT NULL,
	"fecha" date NOT NULL,
	"entregado_a" text NOT NULL,
	"entregado_a_usuario_id" uuid,
	"monto" numeric(14, 2) NOT NULL,
	"motivo" text NOT NULL,
	"estado" text DEFAULT 'abierto' NOT NULL,
	"fecha_de_liquidacion" date,
	"liquidado_en" timestamp with time zone,
	"liquidado_por" uuid,
	"devuelto" numeric(14, 2) DEFAULT '0' NOT NULL,
	"fecha_de_anulacion" date,
	"anulado_en" timestamp with time zone,
	"anulado_por" uuid,
	"motivo_de_anulacion" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "vales_numero_unico" UNIQUE("empresa_id","anio_de_numero","numero"),
	CONSTRAINT "vales_llave_unica" UNIQUE("id","empresa_id","fondo_id"),
	CONSTRAINT "vales_numero_positivo" CHECK ("caja_chica"."vales_provisionales"."numero" > 0),
	CONSTRAINT "vales_entregado_a_valido" CHECK ("caja_chica"."vales_provisionales"."entregado_a" is not null and ("caja_chica"."vales_provisionales"."entregado_a" is null or (char_length("caja_chica"."vales_provisionales"."entregado_a") between 1 and 150 and "caja_chica"."vales_provisionales"."entregado_a" = btrim("caja_chica"."vales_provisionales"."entregado_a")))),
	CONSTRAINT "vales_monto_positivo" CHECK ("caja_chica"."vales_provisionales"."monto" > 0),
	CONSTRAINT "vales_motivo_valido" CHECK ("caja_chica"."vales_provisionales"."motivo" is not null and ("caja_chica"."vales_provisionales"."motivo" is null or (char_length("caja_chica"."vales_provisionales"."motivo") between 1 and 300 and "caja_chica"."vales_provisionales"."motivo" = btrim("caja_chica"."vales_provisionales"."motivo")))),
	CONSTRAINT "vales_estado_valido" CHECK ("caja_chica"."vales_provisionales"."estado" in ('abierto', 'liquidado', 'anulado')),
	CONSTRAINT "vales_liquidacion_completa" CHECK (("caja_chica"."vales_provisionales"."estado" = 'liquidado') = ("caja_chica"."vales_provisionales"."fecha_de_liquidacion" is not null) and ("caja_chica"."vales_provisionales"."fecha_de_liquidacion" is not null) = ("caja_chica"."vales_provisionales"."liquidado_en" is not null) and ("caja_chica"."vales_provisionales"."liquidado_en" is not null) = ("caja_chica"."vales_provisionales"."liquidado_por" is not null)),
	CONSTRAINT "vales_devuelto_valido" CHECK ("caja_chica"."vales_provisionales"."devuelto" >= 0 and "caja_chica"."vales_provisionales"."devuelto" <= "caja_chica"."vales_provisionales"."monto"),
	CONSTRAINT "vales_abierto_sin_devuelto" CHECK ("caja_chica"."vales_provisionales"."estado" = 'liquidado' or "caja_chica"."vales_provisionales"."devuelto" = 0),
	CONSTRAINT "vales_anulacion_completa" CHECK (("caja_chica"."vales_provisionales"."estado" = 'anulado') = ("caja_chica"."vales_provisionales"."anulado_en" is not null) and ("caja_chica"."vales_provisionales"."anulado_en" is not null) = ("caja_chica"."vales_provisionales"."anulado_por" is not null) and ("caja_chica"."vales_provisionales"."anulado_por" is not null) = ("caja_chica"."vales_provisionales"."motivo_de_anulacion" is not null)),
	CONSTRAINT "vales_motivo_de_anulacion_rango" CHECK ("caja_chica"."vales_provisionales"."motivo_de_anulacion" is null or char_length("caja_chica"."vales_provisionales"."motivo_de_anulacion") between 1 and 300),
	CONSTRAINT "vales_fecha_de_anulacion_de_su_estado" CHECK (("caja_chica"."vales_provisionales"."estado" = 'anulado') = ("caja_chica"."vales_provisionales"."fecha_de_anulacion" is not null)),
	CONSTRAINT "vales_fecha_de_anulacion_valida" CHECK ("caja_chica"."vales_provisionales"."fecha_de_anulacion" is null or "caja_chica"."vales_provisionales"."fecha_de_anulacion" >= "caja_chica"."vales_provisionales"."fecha")
);
--> statement-breakpoint
ALTER TABLE "caja_chica"."vales_provisionales" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "caja_chica"."accesos_a_fondos" ADD CONSTRAINT "accesos_a_fondos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."accesos_a_fondos" ADD CONSTRAINT "accesos_a_fondos_fondo_fk" FOREIGN KEY ("fondo_id","empresa_id") REFERENCES "caja_chica"."fondos"("id","empresa_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."accesos_a_fondos" ADD CONSTRAINT "accesos_a_fondos_miembro_fk" FOREIGN KEY ("empresa_id","usuario_id") REFERENCES "core"."empresa_usuarios"("empresa_id","usuario_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."arqueos" ADD CONSTRAINT "arqueos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."arqueos" ADD CONSTRAINT "arqueos_arqueado_por_usuarios_id_fk" FOREIGN KEY ("arqueado_por") REFERENCES "core"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."arqueos" ADD CONSTRAINT "arqueos_custodio_usuario_id_usuarios_id_fk" FOREIGN KEY ("custodio_usuario_id") REFERENCES "core"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."arqueos" ADD CONSTRAINT "arqueos_fondo_fk" FOREIGN KEY ("fondo_id","empresa_id") REFERENCES "caja_chica"."fondos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."cambios_de_monto" ADD CONSTRAINT "cambios_de_monto_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."cambios_de_monto" ADD CONSTRAINT "cambios_de_monto_movimiento_id_movimientos_id_fk" FOREIGN KEY ("movimiento_id") REFERENCES "bancos"."movimientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."cambios_de_monto" ADD CONSTRAINT "cambios_fondo_fk" FOREIGN KEY ("fondo_id","empresa_id") REFERENCES "caja_chica"."fondos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."comprobantes" ADD CONSTRAINT "comprobantes_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."comprobantes" ADD CONSTRAINT "comprobantes_documento_de_compra_id_documentos_id_fk" FOREIGN KEY ("documento_de_compra_id") REFERENCES "libro_de_compras"."documentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."comprobantes" ADD CONSTRAINT "comprobantes_proveedor_id_proveedores_id_fk" FOREIGN KEY ("proveedor_id") REFERENCES "terceros"."proveedores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."comprobantes" ADD CONSTRAINT "comprobantes_fondo_fk" FOREIGN KEY ("fondo_id","empresa_id") REFERENCES "caja_chica"."fondos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."comprobantes" ADD CONSTRAINT "comprobantes_concepto_de_gasto_fk" FOREIGN KEY ("concepto_de_gasto_id","empresa_id") REFERENCES "libro_de_compras"."conceptos_de_gasto"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."comprobantes" ADD CONSTRAINT "comprobantes_afectado_fk" FOREIGN KEY ("documento_afectado_id","empresa_id","fondo_id") REFERENCES "caja_chica"."comprobantes"("id","empresa_id","fondo_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."comprobantes" ADD CONSTRAINT "comprobantes_arqueo_fk" FOREIGN KEY ("arqueo_id","empresa_id","fondo_id") REFERENCES "caja_chica"."arqueos"("id","empresa_id","fondo_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."comprobantes" ADD CONSTRAINT "comprobantes_vale_provisional_fk" FOREIGN KEY ("vale_provisional_id","empresa_id","fondo_id") REFERENCES "caja_chica"."vales_provisionales"("id","empresa_id","fondo_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."custodios_de_fondos" ADD CONSTRAINT "custodios_de_fondos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."custodios_de_fondos" ADD CONSTRAINT "custodios_de_fondos_custodio_usuario_id_usuarios_id_fk" FOREIGN KEY ("custodio_usuario_id") REFERENCES "core"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."custodios_de_fondos" ADD CONSTRAINT "custodios_fondo_fk" FOREIGN KEY ("fondo_id","empresa_id") REFERENCES "caja_chica"."fondos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."custodios_de_fondos" ADD CONSTRAINT "custodios_arqueo_de_entrega_fk" FOREIGN KEY ("arqueo_de_entrega_id","empresa_id","fondo_id") REFERENCES "caja_chica"."arqueos"("id","empresa_id","fondo_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."fondos" ADD CONSTRAINT "fondos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."fondos" ADD CONSTRAINT "fondos_cuenta_bancaria_id_cuentas_bancarias_id_fk" FOREIGN KEY ("cuenta_bancaria_id") REFERENCES "bancos"."cuentas_bancarias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."fondos" ADD CONSTRAINT "fondos_localidad_fk" FOREIGN KEY ("localidad_id","empresa_id") REFERENCES "empresas"."localidades"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."reposicion_comprobantes" ADD CONSTRAINT "reposicion_comprobantes_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."reposicion_comprobantes" ADD CONSTRAINT "reposicion_comprobantes_reposicion_fk" FOREIGN KEY ("reposicion_id","empresa_id","fondo_id") REFERENCES "caja_chica"."reposiciones"("id","empresa_id","fondo_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."reposicion_comprobantes" ADD CONSTRAINT "reposicion_comprobantes_comprobante_fk" FOREIGN KEY ("comprobante_id","empresa_id","fondo_id") REFERENCES "caja_chica"."comprobantes"("id","empresa_id","fondo_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."reposiciones" ADD CONSTRAINT "reposiciones_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."reposiciones" ADD CONSTRAINT "reposiciones_movimiento_id_movimientos_id_fk" FOREIGN KEY ("movimiento_id") REFERENCES "bancos"."movimientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."reposiciones" ADD CONSTRAINT "reposiciones_fondo_fk" FOREIGN KEY ("fondo_id","empresa_id") REFERENCES "caja_chica"."fondos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."vales_provisionales" ADD CONSTRAINT "vales_provisionales_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."vales_provisionales" ADD CONSTRAINT "vales_provisionales_entregado_a_usuario_id_usuarios_id_fk" FOREIGN KEY ("entregado_a_usuario_id") REFERENCES "core"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."vales_provisionales" ADD CONSTRAINT "vales_provisionales_fondo_fk" FOREIGN KEY ("fondo_id","empresa_id") REFERENCES "caja_chica"."fondos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accesos_a_fondos_fondo_idx" ON "caja_chica"."accesos_a_fondos" USING btree ("fondo_id");--> statement-breakpoint
CREATE INDEX "arqueos_fondo_idx" ON "caja_chica"."arqueos" USING btree ("fondo_id","realizado_en" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "cambios_movimiento_unico" ON "caja_chica"."cambios_de_monto" USING btree ("movimiento_id") WHERE "caja_chica"."cambios_de_monto"."movimiento_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "cambios_apertura_unica" ON "caja_chica"."cambios_de_monto" USING btree ("fondo_id") WHERE "caja_chica"."cambios_de_monto"."tipo" = 'apertura' and "caja_chica"."cambios_de_monto"."estado" = 'vigente';--> statement-breakpoint
CREATE UNIQUE INDEX "cambios_cierre_unico" ON "caja_chica"."cambios_de_monto" USING btree ("fondo_id") WHERE "caja_chica"."cambios_de_monto"."tipo" = 'cierre' and "caja_chica"."cambios_de_monto"."estado" = 'vigente';--> statement-breakpoint
CREATE INDEX "cambios_fondo_idx" ON "caja_chica"."cambios_de_monto" USING btree ("fondo_id","fecha");--> statement-breakpoint
CREATE UNIQUE INDEX "comprobantes_documento_unico" ON "caja_chica"."comprobantes" USING btree ("documento_de_compra_id") WHERE "caja_chica"."comprobantes"."documento_de_compra_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "comprobantes_numero_unico" ON "caja_chica"."comprobantes" USING btree ("empresa_id","anio_de_numero","numero") WHERE "caja_chica"."comprobantes"."numero" is not null;--> statement-breakpoint
CREATE INDEX "comprobantes_fondo_idx" ON "caja_chica"."comprobantes" USING btree ("fondo_id","estado");--> statement-breakpoint
CREATE INDEX "comprobantes_bandeja_idx" ON "caja_chica"."comprobantes" USING btree ("empresa_id") WHERE "caja_chica"."comprobantes"."fondo_id" is null and "caja_chica"."comprobantes"."estado" = 'vigente';--> statement-breakpoint
CREATE INDEX "comprobantes_proveedor_fecha_idx" ON "caja_chica"."comprobantes" USING btree ("proveedor_id","fecha") WHERE "caja_chica"."comprobantes"."proveedor_id" is not null and "caja_chica"."comprobantes"."estado" = 'vigente';--> statement-breakpoint
CREATE INDEX "comprobantes_arqueo_idx" ON "caja_chica"."comprobantes" USING btree ("arqueo_id") WHERE "caja_chica"."comprobantes"."arqueo_id" is not null;--> statement-breakpoint
CREATE INDEX "comprobantes_vale_idx" ON "caja_chica"."comprobantes" USING btree ("vale_provisional_id") WHERE "caja_chica"."comprobantes"."vale_provisional_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "custodios_vigente_unico" ON "caja_chica"."custodios_de_fondos" USING btree ("fondo_id") WHERE "caja_chica"."custodios_de_fondos"."hasta" is null;--> statement-breakpoint
CREATE INDEX "custodios_fondo_idx" ON "caja_chica"."custodios_de_fondos" USING btree ("fondo_id","desde");--> statement-breakpoint
CREATE INDEX "custodios_usuario_idx" ON "caja_chica"."custodios_de_fondos" USING btree ("custodio_usuario_id") WHERE "caja_chica"."custodios_de_fondos"."custodio_usuario_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "fondos_nombre_unico" ON "caja_chica"."fondos" USING btree ("empresa_id",core.nombre_normalizado("nombre"));--> statement-breakpoint
CREATE INDEX "fondos_lista_idx" ON "caja_chica"."fondos" USING btree ("empresa_id","estado");--> statement-breakpoint
CREATE INDEX "fondos_localidad_idx" ON "caja_chica"."fondos" USING btree ("localidad_id") WHERE "caja_chica"."fondos"."localidad_id" is not null;--> statement-breakpoint
CREATE INDEX "fondos_cuenta_bancaria_idx" ON "caja_chica"."fondos" USING btree ("cuenta_bancaria_id") WHERE "caja_chica"."fondos"."cuenta_bancaria_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "reposicion_comprobantes_vigente_unico" ON "caja_chica"."reposicion_comprobantes" USING btree ("comprobante_id") WHERE "caja_chica"."reposicion_comprobantes"."vigente";--> statement-breakpoint
CREATE INDEX "reposicion_comprobantes_fondo_idx" ON "caja_chica"."reposicion_comprobantes" USING btree ("fondo_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reposiciones_movimiento_unico" ON "caja_chica"."reposiciones" USING btree ("movimiento_id") WHERE "caja_chica"."reposiciones"."movimiento_id" is not null;--> statement-breakpoint
CREATE INDEX "reposiciones_fondo_idx" ON "caja_chica"."reposiciones" USING btree ("fondo_id","fecha");--> statement-breakpoint
CREATE INDEX "vales_fondo_idx" ON "caja_chica"."vales_provisionales" USING btree ("fondo_id","estado","fecha");--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "caja_chica"."accesos_a_fondos" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "asignar_para_asignar" ON "caja_chica"."accesos_a_fondos" AS RESTRICTIVE FOR INSERT TO "arrancar_app" WITH CHECK ('caja-chica.fondos' = any (string_to_array((select current_setting('app.alcance_para_asignar', true)), ',')));--> statement-breakpoint
CREATE POLICY "cambiar_para_asignar" ON "caja_chica"."accesos_a_fondos" AS RESTRICTIVE FOR UPDATE TO "arrancar_app" USING ('caja-chica.fondos' = any (string_to_array((select current_setting('app.alcance_para_asignar', true)), ','))) WITH CHECK ('caja-chica.fondos' = any (string_to_array((select current_setting('app.alcance_para_asignar', true)), ',')));--> statement-breakpoint
CREATE POLICY "quitar_para_asignar" ON "caja_chica"."accesos_a_fondos" AS RESTRICTIVE FOR DELETE TO "arrancar_app" USING ('caja-chica.fondos' = any (string_to_array((select current_setting('app.alcance_para_asignar', true)), ',')));--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "caja_chica"."arqueos" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "alcance_caja_chica_fondos" ON "caja_chica"."arqueos" AS RESTRICTIVE FOR ALL TO "arrancar_app" USING ('caja-chica.fondos' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or fondo_id in (
      select a.fondo_id from caja_chica.accesos_a_fondos a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    )) WITH CHECK ('caja-chica.fondos' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or fondo_id in (
      select a.fondo_id from caja_chica.accesos_a_fondos a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    ));--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "caja_chica"."cambios_de_monto" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "alcance_caja_chica_fondos" ON "caja_chica"."cambios_de_monto" AS RESTRICTIVE FOR ALL TO "arrancar_app" USING ('caja-chica.fondos' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or fondo_id in (
      select a.fondo_id from caja_chica.accesos_a_fondos a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    )) WITH CHECK ('caja-chica.fondos' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or fondo_id in (
      select a.fondo_id from caja_chica.accesos_a_fondos a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    ));--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "caja_chica"."comprobantes" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "alcance_caja_chica_fondos" ON "caja_chica"."comprobantes" AS RESTRICTIVE FOR ALL TO "arrancar_app" USING (fondo_id is null or 'caja-chica.fondos' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or fondo_id in (
      select a.fondo_id from caja_chica.accesos_a_fondos a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    )) WITH CHECK (fondo_id is null or 'caja-chica.fondos' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or fondo_id in (
      select a.fondo_id from caja_chica.accesos_a_fondos a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    ));--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "caja_chica"."custodios_de_fondos" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "alcance_caja_chica_fondos" ON "caja_chica"."custodios_de_fondos" AS RESTRICTIVE FOR ALL TO "arrancar_app" USING ('caja-chica.fondos' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or fondo_id in (
      select a.fondo_id from caja_chica.accesos_a_fondos a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    )) WITH CHECK ('caja-chica.fondos' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or fondo_id in (
      select a.fondo_id from caja_chica.accesos_a_fondos a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    ));--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "caja_chica"."fondos" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "alcance_ver" ON "caja_chica"."fondos" AS RESTRICTIVE FOR SELECT TO "arrancar_app" USING ('caja-chica.fondos' = any (string_to_array((select current_setting('app.alcance_para_asignar', true)), ',')) or 'caja-chica.fondos' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or id in (
      select a.fondo_id from caja_chica.accesos_a_fondos a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    ));--> statement-breakpoint
CREATE POLICY "alcance_cambiar" ON "caja_chica"."fondos" AS RESTRICTIVE FOR UPDATE TO "arrancar_app" USING ('caja-chica.fondos' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or id in (
      select a.fondo_id from caja_chica.accesos_a_fondos a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    )) WITH CHECK ('caja-chica.fondos' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or id in (
      select a.fondo_id from caja_chica.accesos_a_fondos a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    ));--> statement-breakpoint
CREATE POLICY "alcance_eliminar" ON "caja_chica"."fondos" AS RESTRICTIVE FOR DELETE TO "arrancar_app" USING ('caja-chica.fondos' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or id in (
      select a.fondo_id from caja_chica.accesos_a_fondos a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    ));--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "caja_chica"."reposicion_comprobantes" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "alcance_caja_chica_fondos" ON "caja_chica"."reposicion_comprobantes" AS RESTRICTIVE FOR ALL TO "arrancar_app" USING ('caja-chica.fondos' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or fondo_id in (
      select a.fondo_id from caja_chica.accesos_a_fondos a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    )) WITH CHECK ('caja-chica.fondos' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or fondo_id in (
      select a.fondo_id from caja_chica.accesos_a_fondos a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    ));--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "caja_chica"."reposiciones" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "alcance_caja_chica_fondos" ON "caja_chica"."reposiciones" AS RESTRICTIVE FOR ALL TO "arrancar_app" USING ('caja-chica.fondos' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or fondo_id in (
      select a.fondo_id from caja_chica.accesos_a_fondos a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    )) WITH CHECK ('caja-chica.fondos' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or fondo_id in (
      select a.fondo_id from caja_chica.accesos_a_fondos a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    ));--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "caja_chica"."vales_provisionales" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "alcance_caja_chica_fondos" ON "caja_chica"."vales_provisionales" AS RESTRICTIVE FOR ALL TO "arrancar_app" USING ('caja-chica.fondos' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or fondo_id in (
      select a.fondo_id from caja_chica.accesos_a_fondos a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    )) WITH CHECK ('caja-chica.fondos' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or fondo_id in (
      select a.fondo_id from caja_chica.accesos_a_fondos a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    ));
--> statement-breakpoint
-- Quien abre un fondo queda con acceso a él (la función es del core y sirve a cualquier tabla de accesos; no actúa al
-- importar desde Excel ni sin usuario en la transacción). Corre como el dueño de la tabla (sin RLS).
CREATE TRIGGER asignar_al_creador AFTER INSERT ON caja_chica.fondos
  FOR EACH ROW EXECUTE FUNCTION core.asignar_registro_al_creador('caja_chica.accesos_a_fondos', 'fondo_id');--> statement-breakpoint
-- CC-e: el custodio que es usuario de la empresa recibe acceso a su fondo al nombrarlo, sin necesitar el permiso de
-- asignar. Al cambiar de custodio el anterior conserva su acceso (se quita en la ventana de asignación). Corre como el
-- dueño (sin RLS), con `search_path` vacío; solo da acceso a un miembro de la empresa del propio fondo.
CREATE FUNCTION caja_chica.asignar_fondo_al_custodio() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  quien uuid := nullif(current_setting('app.usuario_id', true), '')::uuid;
BEGIN
  IF new.custodio_usuario_id IS NULL THEN RETURN NULL; END IF;
  INSERT INTO caja_chica.accesos_a_fondos (empresa_id, usuario_id, fondo_id, creado_por, actualizado_por)
  SELECT new.empresa_id, new.custodio_usuario_id, new.fondo_id, quien, quien
  WHERE EXISTS (SELECT 1 FROM core.empresa_usuarios eu
                WHERE eu.empresa_id = new.empresa_id AND eu.usuario_id = new.custodio_usuario_id)
  ON CONFLICT DO NOTHING;
  RETURN NULL;
END $$;--> statement-breakpoint
REVOKE ALL ON FUNCTION caja_chica.asignar_fondo_al_custodio() FROM PUBLIC;--> statement-breakpoint
CREATE TRIGGER asignar_fondo_al_custodio AFTER INSERT ON caja_chica.custodios_de_fondos
  FOR EACH ROW EXECUTE FUNCTION caja_chica.asignar_fondo_al_custodio();
