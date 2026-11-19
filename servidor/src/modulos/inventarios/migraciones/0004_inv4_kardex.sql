CREATE TABLE "inventarios"."capas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"articulo_id" uuid NOT NULL,
	"movimiento_de_entrada_id" uuid NOT NULL,
	"fecha" date NOT NULL,
	"secuencia" bigint NOT NULL,
	"cantidad_inicial" numeric(14, 4) NOT NULL,
	"valor_inicial" numeric(14, 2) NOT NULL,
	"cantidad_restante" numeric(16, 4) NOT NULL,
	"valor_restante" numeric(14, 2) NOT NULL,
	"vigente" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "capas_id_empresa_unico" UNIQUE("id","empresa_id"),
	CONSTRAINT "capas_entrada_unica" UNIQUE("movimiento_de_entrada_id"),
	CONSTRAINT "capas_cantidades" CHECK ("inventarios"."capas"."cantidad_inicial" > 0 and "inventarios"."capas"."cantidad_restante" >= 0 and "inventarios"."capas"."valor_restante" >= 0),
	CONSTRAINT "capas_valor_sin_cantidad" CHECK ("inventarios"."capas"."cantidad_restante" > 0 or "inventarios"."capas"."valor_restante" = 0)
);
--> statement-breakpoint
ALTER TABLE "inventarios"."capas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventarios"."consumos_de_capas" (
	"empresa_id" uuid NOT NULL,
	"movimiento_de_salida_id" uuid NOT NULL,
	"capa_id" uuid NOT NULL,
	"cantidad" numeric(14, 4) NOT NULL,
	"valor" numeric(14, 2) NOT NULL,
	CONSTRAINT "consumos_de_capas_pk" PRIMARY KEY("movimiento_de_salida_id","capa_id"),
	CONSTRAINT "consumos_de_capas_montos" CHECK ("inventarios"."consumos_de_capas"."cantidad" > 0 and "inventarios"."consumos_de_capas"."valor" >= 0)
);
--> statement-breakpoint
ALTER TABLE "inventarios"."consumos_de_capas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventarios"."documentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"clase" text NOT NULL,
	"numero" integer NOT NULL,
	"fecha" date NOT NULL,
	"bodega_id" uuid,
	"documento_relacionado_id" uuid,
	"documento_de_compra_id" uuid,
	"causa" text,
	"destino" text,
	"concepto_de_gasto_id" uuid,
	"localidad_id" uuid,
	"departamento_id" uuid,
	"activo_fijo_id" uuid,
	"entregado_a" text,
	"soporte" text,
	"requiere_factura" boolean DEFAULT false NOT NULL,
	"observaciones" text,
	"estado" text DEFAULT 'vigente' NOT NULL,
	"anulado_en" timestamp with time zone,
	"anulado_por" uuid,
	"motivo_de_anulacion" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "documentos_numero_unico" UNIQUE("empresa_id","clase","numero"),
	CONSTRAINT "documentos_id_empresa_unico" UNIQUE("id","empresa_id"),
	CONSTRAINT "documentos_clase_valida" CHECK ("inventarios"."documentos"."clase" in ('entrada_manual', 'salida_por_consumo')),
	CONSTRAINT "documentos_numero_positivo" CHECK ("inventarios"."documentos"."numero" > 0),
	CONSTRAINT "documentos_estado" CHECK ("inventarios"."documentos"."estado" in ('vigente', 'anulado')),
	CONSTRAINT "documentos_causa_segun_clase" CHECK (("inventarios"."documentos"."clase" = 'entrada_manual') = ("inventarios"."documentos"."causa" is not null)),
	CONSTRAINT "documentos_causa_valida" CHECK ("inventarios"."documentos"."causa" is null or "inventarios"."documentos"."causa" in ('produccion_propia', 'donacion_recibida', 'aporte', 'otra')),
	CONSTRAINT "documentos_destino_segun_clase" CHECK (("inventarios"."documentos"."clase" = 'salida_por_consumo') = ("inventarios"."documentos"."destino" is not null)),
	CONSTRAINT "documentos_destino_valido" CHECK ("inventarios"."documentos"."destino" is null or "inventarios"."documentos"."destino" in ('gasto', 'obra_de_activo_fijo', 'mantenimiento_de_activo_fijo')),
	CONSTRAINT "documentos_concepto_segun_destino" CHECK (coalesce("inventarios"."documentos"."destino" in ('gasto', 'mantenimiento_de_activo_fijo'), false) = ("inventarios"."documentos"."concepto_de_gasto_id" is not null)),
	CONSTRAINT "documentos_activo_fijo_segun_destino" CHECK (coalesce("inventarios"."documentos"."destino" in ('obra_de_activo_fijo', 'mantenimiento_de_activo_fijo'), false) = ("inventarios"."documentos"."activo_fijo_id" is not null)),
	CONSTRAINT "documentos_soporte_de_entrada" CHECK ("inventarios"."documentos"."clase" <> 'entrada_manual' or "inventarios"."documentos"."soporte" is not null),
	CONSTRAINT "documentos_bodega_obligatoria" CHECK ("inventarios"."documentos"."bodega_id" is not null),
	CONSTRAINT "documentos_soporte_largo" CHECK ("inventarios"."documentos"."soporte" is null or char_length(btrim("inventarios"."documentos"."soporte")) between 1 and 150),
	CONSTRAINT "documentos_entregado_a_largo" CHECK ("inventarios"."documentos"."entregado_a" is null or char_length(btrim("inventarios"."documentos"."entregado_a")) between 1 and 150),
	CONSTRAINT "documentos_observaciones_largo" CHECK ("inventarios"."documentos"."observaciones" is null or char_length(btrim("inventarios"."documentos"."observaciones")) between 1 and 500),
	CONSTRAINT "documentos_anulacion_completa" CHECK (("inventarios"."documentos"."estado" = 'anulado') = ("inventarios"."documentos"."anulado_en" is not null and "inventarios"."documentos"."anulado_por" is not null and "inventarios"."documentos"."motivo_de_anulacion" is not null)),
	CONSTRAINT "documentos_motivo_largo" CHECK ("inventarios"."documentos"."motivo_de_anulacion" is null or char_length(btrim("inventarios"."documentos"."motivo_de_anulacion")) between 1 and 300)
);
--> statement-breakpoint
ALTER TABLE "inventarios"."documentos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventarios"."existencias" (
	"empresa_id" uuid NOT NULL,
	"bodega_id" uuid NOT NULL,
	"articulo_id" uuid NOT NULL,
	"lote_id" uuid,
	"lote_clave" uuid DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
	"cantidad" numeric(16, 4) NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "existencias_pk" PRIMARY KEY("empresa_id","bodega_id","articulo_id","lote_clave"),
	CONSTRAINT "existencias_cantidad_no_negativa" CHECK ("inventarios"."existencias"."cantidad" >= 0),
	CONSTRAINT "existencias_clave_del_lote" CHECK ("inventarios"."existencias"."lote_clave" = coalesce("inventarios"."existencias"."lote_id", '00000000-0000-0000-0000-000000000000'::uuid))
);
--> statement-breakpoint
ALTER TABLE "inventarios"."existencias" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventarios"."metodos_de_costeo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"metodo" text NOT NULL,
	"desde" date NOT NULL,
	"fijado_en" timestamp with time zone,
	"autorizacion_sat_numero" text,
	"autorizacion_sat_fecha" date,
	"motivo" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "metodos_de_costeo_id_empresa_unico" UNIQUE("id","empresa_id"),
	CONSTRAINT "metodos_de_costeo_desde_unico" UNIQUE("empresa_id","desde"),
	CONSTRAINT "metodos_de_costeo_metodo" CHECK ("inventarios"."metodos_de_costeo"."metodo" in ('promedio_ponderado', 'peps')),
	CONSTRAINT "metodos_de_costeo_primer_dia" CHECK (extract(day from "inventarios"."metodos_de_costeo"."desde") = 1),
	CONSTRAINT "metodos_de_costeo_desde_de_la_autorizacion" CHECK ("inventarios"."metodos_de_costeo"."autorizacion_sat_fecha" is null or ("inventarios"."metodos_de_costeo"."autorizacion_sat_fecha" < "inventarios"."metodos_de_costeo"."desde" and "inventarios"."metodos_de_costeo"."desde" = make_date(extract(year from "inventarios"."metodos_de_costeo"."autorizacion_sat_fecha")::int + 1, 1, 1))),
	CONSTRAINT "metodos_de_costeo_autorizacion_completa" CHECK (("inventarios"."metodos_de_costeo"."autorizacion_sat_numero" is null) = ("inventarios"."metodos_de_costeo"."autorizacion_sat_fecha" is null)),
	CONSTRAINT "metodos_de_costeo_autorizacion_largo" CHECK ("inventarios"."metodos_de_costeo"."autorizacion_sat_numero" is null or char_length(btrim("inventarios"."metodos_de_costeo"."autorizacion_sat_numero")) between 1 and 60),
	CONSTRAINT "metodos_de_costeo_motivo_largo" CHECK ("inventarios"."metodos_de_costeo"."motivo" is null or char_length(btrim("inventarios"."metodos_de_costeo"."motivo")) between 1 and 500)
);
--> statement-breakpoint
ALTER TABLE "inventarios"."metodos_de_costeo" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventarios"."movimientos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"documento_id" uuid NOT NULL,
	"articulo_id" uuid NOT NULL,
	"bodega_id" uuid,
	"lote_id" uuid,
	"fecha" date NOT NULL,
	"orden_del_dia" smallint NOT NULL,
	"secuencia" bigint GENERATED ALWAYS AS IDENTITY (sequence name "inventarios"."movimientos_secuencia_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"tipo" text NOT NULL,
	"cantidad" numeric(14, 4) NOT NULL,
	"cantidad_escrita" numeric(14, 4),
	"unidad_escrita_id" uuid,
	"costo_unitario" numeric(15, 6) NOT NULL,
	"costo_total" numeric(14, 2) NOT NULL,
	"costo_del_metodo" boolean NOT NULL,
	"saldo_cantidad" numeric(16, 4) NOT NULL,
	"saldo_valor" numeric(14, 2) NOT NULL,
	"linea_de_documento_de_compra_id" uuid,
	"documento_de_compra_id" uuid,
	"movimiento_de_origen_id" uuid,
	"monto_a_resultados" numeric(14, 2) DEFAULT '0' NOT NULL,
	"vigente" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "movimientos_id_empresa_unico" UNIQUE("id","empresa_id"),
	CONSTRAINT "movimientos_tipo" CHECK ("inventarios"."movimientos"."tipo" in ('entrada', 'salida', 'valor', 'traslado')),
	CONSTRAINT "movimientos_orden_del_dia" CHECK ("inventarios"."movimientos"."orden_del_dia" in (0, 1, 2)),
	CONSTRAINT "movimientos_cantidad_por_tipo" CHECK (("inventarios"."movimientos"."tipo" = 'entrada' and "inventarios"."movimientos"."cantidad" > 0) or ("inventarios"."movimientos"."tipo" = 'salida' and "inventarios"."movimientos"."cantidad" < 0) or ("inventarios"."movimientos"."tipo" = 'valor' and "inventarios"."movimientos"."cantidad" = 0) or ("inventarios"."movimientos"."tipo" = 'traslado' and "inventarios"."movimientos"."cantidad" <> 0)),
	CONSTRAINT "movimientos_costo_unitario" CHECK ("inventarios"."movimientos"."costo_unitario" >= 0),
	CONSTRAINT "movimientos_costo_por_tipo" CHECK (("inventarios"."movimientos"."tipo" = 'entrada' and "inventarios"."movimientos"."costo_total" >= 0) or ("inventarios"."movimientos"."tipo" = 'salida' and "inventarios"."movimientos"."costo_total" <= 0) or "inventarios"."movimientos"."tipo" in ('valor', 'traslado')),
	CONSTRAINT "movimientos_saldos_no_negativos" CHECK ("inventarios"."movimientos"."saldo_cantidad" >= 0 and "inventarios"."movimientos"."saldo_valor" >= 0),
	CONSTRAINT "movimientos_saldo_sin_cantidad" CHECK ("inventarios"."movimientos"."saldo_cantidad" > 0 or "inventarios"."movimientos"."saldo_valor" = 0),
	CONSTRAINT "movimientos_bodega_salvo_valor" CHECK ("inventarios"."movimientos"."tipo" = 'valor' or "inventarios"."movimientos"."bodega_id" is not null),
	CONSTRAINT "movimientos_unidad_escrita_completa" CHECK (("inventarios"."movimientos"."cantidad_escrita" is null) = ("inventarios"."movimientos"."unidad_escrita_id" is null)),
	CONSTRAINT "movimientos_linea_de_compra_completa" CHECK (("inventarios"."movimientos"."linea_de_documento_de_compra_id" is null) = ("inventarios"."movimientos"."documento_de_compra_id" is null))
);
--> statement-breakpoint
ALTER TABLE "inventarios"."movimientos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventarios"."recalculos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"articulo_id" uuid NOT NULL,
	"desde_fecha" date NOT NULL,
	"documento_causa_id" uuid,
	"metodo_de_costeo_id" uuid,
	"causa" text NOT NULL,
	"salidas_afectadas" integer NOT NULL,
	"diferencia_de_costo" numeric(14, 2) NOT NULL,
	"repartos_afectados" integer DEFAULT 0 NOT NULL,
	"diferencia_a_resultados" numeric(14, 2) DEFAULT '0' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "recalculos_causa" CHECK ("inventarios"."recalculos"."causa" in ('registro_con_fecha_anterior', 'anulacion', 'saldo_inicial_corregido', 'cambio_de_metodo')),
	CONSTRAINT "recalculos_origen" CHECK (("inventarios"."recalculos"."causa" = 'cambio_de_metodo' and "inventarios"."recalculos"."metodo_de_costeo_id" is not null and "inventarios"."recalculos"."documento_causa_id" is null) or ("inventarios"."recalculos"."causa" <> 'cambio_de_metodo' and "inventarios"."recalculos"."documento_causa_id" is not null and "inventarios"."recalculos"."metodo_de_costeo_id" is null)),
	CONSTRAINT "recalculos_conteos" CHECK ("inventarios"."recalculos"."salidas_afectadas" >= 0 and "inventarios"."recalculos"."repartos_afectados" >= 0)
);
--> statement-breakpoint
ALTER TABLE "inventarios"."recalculos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventarios"."saldos_de_articulos" (
	"empresa_id" uuid NOT NULL,
	"articulo_id" uuid NOT NULL,
	"cantidad" numeric(16, 4) NOT NULL,
	"valor" numeric(14, 2) NOT NULL,
	"costo_promedio" numeric(15, 6) NOT NULL,
	"ultimo_movimiento_id" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "saldos_de_articulos_pk" PRIMARY KEY("empresa_id","articulo_id"),
	CONSTRAINT "saldos_de_articulos_no_negativos" CHECK ("inventarios"."saldos_de_articulos"."cantidad" >= 0 and "inventarios"."saldos_de_articulos"."valor" >= 0 and "inventarios"."saldos_de_articulos"."costo_promedio" >= 0),
	CONSTRAINT "saldos_de_articulos_valor_sin_cantidad" CHECK ("inventarios"."saldos_de_articulos"."cantidad" > 0 or "inventarios"."saldos_de_articulos"."valor" = 0)
);
--> statement-breakpoint
ALTER TABLE "inventarios"."saldos_de_articulos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "inventarios"."capas" ADD CONSTRAINT "capas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."capas" ADD CONSTRAINT "capas_articulo_fk" FOREIGN KEY ("articulo_id","empresa_id") REFERENCES "inventarios"."articulos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."capas" ADD CONSTRAINT "capas_entrada_fk" FOREIGN KEY ("movimiento_de_entrada_id","empresa_id") REFERENCES "inventarios"."movimientos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."consumos_de_capas" ADD CONSTRAINT "consumos_de_capas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."consumos_de_capas" ADD CONSTRAINT "consumos_de_capas_salida_fk" FOREIGN KEY ("movimiento_de_salida_id","empresa_id") REFERENCES "inventarios"."movimientos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."consumos_de_capas" ADD CONSTRAINT "consumos_de_capas_capa_fk" FOREIGN KEY ("capa_id","empresa_id") REFERENCES "inventarios"."capas"("id","empresa_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."documentos" ADD CONSTRAINT "documentos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."documentos" ADD CONSTRAINT "documentos_relacionado_fk" FOREIGN KEY ("documento_relacionado_id","empresa_id") REFERENCES "inventarios"."documentos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."documentos" ADD CONSTRAINT "documentos_bodega_fk" FOREIGN KEY ("bodega_id","empresa_id") REFERENCES "inventarios"."bodegas"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."documentos" ADD CONSTRAINT "documentos_compra_fk" FOREIGN KEY ("documento_de_compra_id","empresa_id") REFERENCES "libro_de_compras"."documentos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."documentos" ADD CONSTRAINT "documentos_concepto_fk" FOREIGN KEY ("concepto_de_gasto_id","empresa_id") REFERENCES "libro_de_compras"."conceptos_de_gasto"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."documentos" ADD CONSTRAINT "documentos_localidad_fk" FOREIGN KEY ("localidad_id","empresa_id") REFERENCES "empresas"."localidades"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."documentos" ADD CONSTRAINT "documentos_departamento_fk" FOREIGN KEY ("departamento_id","empresa_id") REFERENCES "empresas"."departamentos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."existencias" ADD CONSTRAINT "existencias_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."existencias" ADD CONSTRAINT "existencias_bodega_fk" FOREIGN KEY ("bodega_id","empresa_id") REFERENCES "inventarios"."bodegas"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."existencias" ADD CONSTRAINT "existencias_articulo_fk" FOREIGN KEY ("articulo_id","empresa_id") REFERENCES "inventarios"."articulos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."existencias" ADD CONSTRAINT "existencias_lote_fk" FOREIGN KEY ("lote_id","empresa_id") REFERENCES "inventarios"."lotes"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."metodos_de_costeo" ADD CONSTRAINT "metodos_de_costeo_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."movimientos" ADD CONSTRAINT "movimientos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."movimientos" ADD CONSTRAINT "movimientos_documento_fk" FOREIGN KEY ("documento_id","empresa_id") REFERENCES "inventarios"."documentos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."movimientos" ADD CONSTRAINT "movimientos_articulo_fk" FOREIGN KEY ("articulo_id","empresa_id") REFERENCES "inventarios"."articulos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."movimientos" ADD CONSTRAINT "movimientos_bodega_fk" FOREIGN KEY ("bodega_id","empresa_id") REFERENCES "inventarios"."bodegas"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."movimientos" ADD CONSTRAINT "movimientos_lote_fk" FOREIGN KEY ("lote_id","empresa_id") REFERENCES "inventarios"."lotes"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."movimientos" ADD CONSTRAINT "movimientos_unidad_escrita_fk" FOREIGN KEY ("unidad_escrita_id","empresa_id") REFERENCES "inventarios"."unidades"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."movimientos" ADD CONSTRAINT "movimientos_linea_de_compra_fk" FOREIGN KEY ("linea_de_documento_de_compra_id","documento_de_compra_id","empresa_id") REFERENCES "libro_de_compras"."lineas_de_documento"("id","documento_id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."movimientos" ADD CONSTRAINT "movimientos_origen_fk" FOREIGN KEY ("movimiento_de_origen_id","empresa_id") REFERENCES "inventarios"."movimientos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."recalculos" ADD CONSTRAINT "recalculos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."recalculos" ADD CONSTRAINT "recalculos_articulo_fk" FOREIGN KEY ("articulo_id","empresa_id") REFERENCES "inventarios"."articulos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."recalculos" ADD CONSTRAINT "recalculos_documento_fk" FOREIGN KEY ("documento_causa_id","empresa_id") REFERENCES "inventarios"."documentos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."recalculos" ADD CONSTRAINT "recalculos_metodo_fk" FOREIGN KEY ("metodo_de_costeo_id","empresa_id") REFERENCES "inventarios"."metodos_de_costeo"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."saldos_de_articulos" ADD CONSTRAINT "saldos_de_articulos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."saldos_de_articulos" ADD CONSTRAINT "saldos_de_articulos_articulo_fk" FOREIGN KEY ("articulo_id","empresa_id") REFERENCES "inventarios"."articulos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "capas_orden_idx" ON "inventarios"."capas" USING btree ("articulo_id","fecha","secuencia") WHERE "inventarios"."capas"."vigente" and "inventarios"."capas"."cantidad_restante" > 0;--> statement-breakpoint
CREATE INDEX "consumos_de_capas_capa_idx" ON "inventarios"."consumos_de_capas" USING btree ("capa_id");--> statement-breakpoint
CREATE INDEX "documentos_fecha_idx" ON "inventarios"."documentos" USING btree ("empresa_id","fecha","clase");--> statement-breakpoint
CREATE INDEX "documentos_bodega_fecha_idx" ON "inventarios"."documentos" USING btree ("bodega_id","fecha");--> statement-breakpoint
CREATE INDEX "documentos_compra_idx" ON "inventarios"."documentos" USING btree ("documento_de_compra_id") WHERE "inventarios"."documentos"."documento_de_compra_id" is not null;--> statement-breakpoint
CREATE INDEX "documentos_concepto_idx" ON "inventarios"."documentos" USING btree ("concepto_de_gasto_id") WHERE "inventarios"."documentos"."concepto_de_gasto_id" is not null;--> statement-breakpoint
CREATE INDEX "documentos_localidad_idx" ON "inventarios"."documentos" USING btree ("localidad_id") WHERE "inventarios"."documentos"."localidad_id" is not null;--> statement-breakpoint
CREATE INDEX "documentos_departamento_idx" ON "inventarios"."documentos" USING btree ("departamento_id") WHERE "inventarios"."documentos"."departamento_id" is not null;--> statement-breakpoint
CREATE INDEX "documentos_relacionado_idx" ON "inventarios"."documentos" USING btree ("documento_relacionado_id") WHERE "inventarios"."documentos"."documento_relacionado_id" is not null;--> statement-breakpoint
CREATE INDEX "existencias_articulo_idx" ON "inventarios"."existencias" USING btree ("articulo_id") WHERE "inventarios"."existencias"."cantidad" > 0;--> statement-breakpoint
CREATE INDEX "existencias_bodega_idx" ON "inventarios"."existencias" USING btree ("bodega_id");--> statement-breakpoint
CREATE INDEX "existencias_lote_idx" ON "inventarios"."existencias" USING btree ("lote_id") WHERE "inventarios"."existencias"."lote_id" is not null;--> statement-breakpoint
CREATE INDEX "metodos_de_costeo_desde_idx" ON "inventarios"."metodos_de_costeo" USING btree ("empresa_id","desde" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "movimientos_documento_idx" ON "inventarios"."movimientos" USING btree ("documento_id");--> statement-breakpoint
CREATE INDEX "movimientos_kardex_idx" ON "inventarios"."movimientos" USING btree ("articulo_id","fecha","orden_del_dia","secuencia") WHERE "inventarios"."movimientos"."vigente";--> statement-breakpoint
CREATE INDEX "movimientos_bodega_idx" ON "inventarios"."movimientos" USING btree ("bodega_id","articulo_id","fecha","orden_del_dia","secuencia") WHERE "inventarios"."movimientos"."vigente";--> statement-breakpoint
CREATE INDEX "movimientos_fecha_idx" ON "inventarios"."movimientos" USING btree ("empresa_id","fecha") WHERE "inventarios"."movimientos"."vigente";--> statement-breakpoint
CREATE INDEX "movimientos_lote_idx" ON "inventarios"."movimientos" USING btree ("lote_id") WHERE "inventarios"."movimientos"."lote_id" is not null;--> statement-breakpoint
CREATE INDEX "movimientos_unidad_escrita_idx" ON "inventarios"."movimientos" USING btree ("unidad_escrita_id") WHERE "inventarios"."movimientos"."unidad_escrita_id" is not null;--> statement-breakpoint
CREATE INDEX "movimientos_linea_de_compra_idx" ON "inventarios"."movimientos" USING btree ("linea_de_documento_de_compra_id") WHERE "inventarios"."movimientos"."linea_de_documento_de_compra_id" is not null;--> statement-breakpoint
CREATE INDEX "movimientos_origen_idx" ON "inventarios"."movimientos" USING btree ("movimiento_de_origen_id") WHERE "inventarios"."movimientos"."movimiento_de_origen_id" is not null;--> statement-breakpoint
CREATE INDEX "recalculos_articulo_idx" ON "inventarios"."recalculos" USING btree ("articulo_id","creado_en" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "recalculos_documento_idx" ON "inventarios"."recalculos" USING btree ("documento_causa_id") WHERE "inventarios"."recalculos"."documento_causa_id" is not null;--> statement-breakpoint
CREATE INDEX "recalculos_metodo_idx" ON "inventarios"."recalculos" USING btree ("metodo_de_costeo_id") WHERE "inventarios"."recalculos"."metodo_de_costeo_id" is not null;--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "inventarios"."capas" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "inventarios"."consumos_de_capas" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "inventarios"."documentos" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "alcance_inventarios_bodegas" ON "inventarios"."documentos" AS RESTRICTIVE FOR ALL TO "arrancar_app" USING (bodega_id is null or 'inventarios.bodegas' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or bodega_id in (
      select a.bodega_id from inventarios.accesos_a_bodegas a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    )) WITH CHECK (bodega_id is null or 'inventarios.bodegas' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or bodega_id in (
      select a.bodega_id from inventarios.accesos_a_bodegas a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    ));--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "inventarios"."existencias" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "alcance_inventarios_bodegas" ON "inventarios"."existencias" AS RESTRICTIVE FOR ALL TO "arrancar_app" USING ('inventarios.bodegas' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or bodega_id in (
      select a.bodega_id from inventarios.accesos_a_bodegas a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    )) WITH CHECK ('inventarios.bodegas' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or bodega_id in (
      select a.bodega_id from inventarios.accesos_a_bodegas a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    ));--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "inventarios"."metodos_de_costeo" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "inventarios"."movimientos" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "inventarios"."recalculos" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "inventarios"."saldos_de_articulos" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);