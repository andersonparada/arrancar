CREATE TABLE "cuentas_por_liquidar"."anticipos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"anio_de_numero" integer DEFAULT 0 NOT NULL,
	"beneficiario_id" uuid NOT NULL,
	"beneficiario" text NOT NULL,
	"es_empleado" boolean NOT NULL,
	"beneficiario_usuario_id" uuid,
	"clase" text NOT NULL,
	"descripcion" text NOT NULL,
	"localidad_id" uuid,
	"fecha" date NOT NULL,
	"fecha_limite" date NOT NULL,
	"monto" numeric(14, 2) NOT NULL,
	"forma" text NOT NULL,
	"movimiento_id" uuid NOT NULL,
	"motivo_con_vencidos" text,
	"estado" text DEFAULT 'abierto' NOT NULL,
	"fecha_de_liquidacion" date,
	"liquidado_en" timestamp with time zone,
	"liquidado_por" uuid,
	"devuelto" numeric(14, 2) DEFAULT '0' NOT NULL,
	"movimiento_de_devolucion_id" uuid,
	"reembolsado" numeric(14, 2) DEFAULT '0' NOT NULL,
	"movimiento_de_reembolso_id" uuid,
	"no_liquidado" numeric(14, 2) DEFAULT '0' NOT NULL,
	"destino_de_no_liquidado" text,
	"cuotas" smallint,
	"motivo_de_no_liquidado" text,
	"fecha_de_anulacion" date,
	"anulado_en" timestamp with time zone,
	"anulado_por" uuid,
	"motivo_de_anulacion" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "anticipos_numero_unico" UNIQUE("empresa_id","anio_de_numero","numero"),
	CONSTRAINT "anticipos_movimiento_unico" UNIQUE("movimiento_id"),
	CONSTRAINT "anticipos_llave_unica" UNIQUE("id","empresa_id"),
	CONSTRAINT "anticipos_numero_positivo" CHECK ("cuentas_por_liquidar"."anticipos"."numero" > 0),
	CONSTRAINT "anticipos_beneficiario_valido" CHECK ("cuentas_por_liquidar"."anticipos"."beneficiario" is not null and ("cuentas_por_liquidar"."anticipos"."beneficiario" is null or (char_length("cuentas_por_liquidar"."anticipos"."beneficiario") between 1 and 150 and "cuentas_por_liquidar"."anticipos"."beneficiario" = btrim("cuentas_por_liquidar"."anticipos"."beneficiario")))),
	CONSTRAINT "anticipos_clase_valida" CHECK ("cuentas_por_liquidar"."anticipos"."clase" in ('viatico', 'compra', 'otro')),
	CONSTRAINT "anticipos_descripcion_valida" CHECK ("cuentas_por_liquidar"."anticipos"."descripcion" is not null and ("cuentas_por_liquidar"."anticipos"."descripcion" is null or (char_length("cuentas_por_liquidar"."anticipos"."descripcion") between 1 and 300 and "cuentas_por_liquidar"."anticipos"."descripcion" = btrim("cuentas_por_liquidar"."anticipos"."descripcion")))),
	CONSTRAINT "anticipos_monto_positivo" CHECK ("cuentas_por_liquidar"."anticipos"."monto" > 0),
	CONSTRAINT "anticipos_fecha_limite_valida" CHECK ("cuentas_por_liquidar"."anticipos"."fecha_limite" >= "cuentas_por_liquidar"."anticipos"."fecha"),
	CONSTRAINT "anticipos_forma_valida" CHECK ("cuentas_por_liquidar"."anticipos"."forma" in ('cheque', 'nota_de_debito')),
	CONSTRAINT "anticipos_motivo_con_vencidos_valido" CHECK (("cuentas_por_liquidar"."anticipos"."motivo_con_vencidos" is null or (char_length("cuentas_por_liquidar"."anticipos"."motivo_con_vencidos") between 1 and 300 and "cuentas_por_liquidar"."anticipos"."motivo_con_vencidos" = btrim("cuentas_por_liquidar"."anticipos"."motivo_con_vencidos")))),
	CONSTRAINT "anticipos_estado_valido" CHECK ("cuentas_por_liquidar"."anticipos"."estado" in ('abierto', 'liquidado', 'anulado')),
	CONSTRAINT "anticipos_liquidacion_completa" CHECK (("cuentas_por_liquidar"."anticipos"."estado" = 'liquidado') = ("cuentas_por_liquidar"."anticipos"."fecha_de_liquidacion" is not null) and ("cuentas_por_liquidar"."anticipos"."fecha_de_liquidacion" is not null) = ("cuentas_por_liquidar"."anticipos"."liquidado_en" is not null) and ("cuentas_por_liquidar"."anticipos"."liquidado_en" is not null) = ("cuentas_por_liquidar"."anticipos"."liquidado_por" is not null)),
	CONSTRAINT "anticipos_abierto_sin_liquidar" CHECK ("cuentas_por_liquidar"."anticipos"."estado" = 'liquidado' or ("cuentas_por_liquidar"."anticipos"."devuelto" = 0 and "cuentas_por_liquidar"."anticipos"."reembolsado" = 0 and "cuentas_por_liquidar"."anticipos"."no_liquidado" = 0 and "cuentas_por_liquidar"."anticipos"."movimiento_de_devolucion_id" is null and "cuentas_por_liquidar"."anticipos"."movimiento_de_reembolso_id" is null)),
	CONSTRAINT "anticipos_montos_liquidados_validos" CHECK ("cuentas_por_liquidar"."anticipos"."devuelto" >= 0 and "cuentas_por_liquidar"."anticipos"."reembolsado" >= 0 and "cuentas_por_liquidar"."anticipos"."no_liquidado" >= 0),
	CONSTRAINT "anticipos_devolucion_con_deposito" CHECK (("cuentas_por_liquidar"."anticipos"."devuelto" > 0) = ("cuentas_por_liquidar"."anticipos"."movimiento_de_devolucion_id" is not null)),
	CONSTRAINT "anticipos_reembolso_con_movimiento" CHECK (("cuentas_por_liquidar"."anticipos"."reembolsado" > 0) = ("cuentas_por_liquidar"."anticipos"."movimiento_de_reembolso_id" is not null)),
	CONSTRAINT "anticipos_reembolso_sin_sobrante" CHECK ("cuentas_por_liquidar"."anticipos"."reembolsado" = 0 or ("cuentas_por_liquidar"."anticipos"."devuelto" = 0 and "cuentas_por_liquidar"."anticipos"."no_liquidado" = 0)),
	CONSTRAINT "anticipos_liquidacion_no_pasa_del_monto" CHECK ("cuentas_por_liquidar"."anticipos"."devuelto" + "cuentas_por_liquidar"."anticipos"."no_liquidado" <= "cuentas_por_liquidar"."anticipos"."monto"),
	CONSTRAINT "anticipos_destino_valido" CHECK ("cuentas_por_liquidar"."anticipos"."destino_de_no_liquidado" is null or "cuentas_por_liquidar"."anticipos"."destino_de_no_liquidado" in ('cobrar', 'renta_del_trabajo', 'perdida')),
	CONSTRAINT "anticipos_destino_de_lo_no_liquidado" CHECK (("cuentas_por_liquidar"."anticipos"."no_liquidado" > 0) = ("cuentas_por_liquidar"."anticipos"."destino_de_no_liquidado" is not null)),
	CONSTRAINT "anticipos_renta_solo_de_empleados" CHECK ("cuentas_por_liquidar"."anticipos"."destino_de_no_liquidado" is distinct from 'renta_del_trabajo' or "cuentas_por_liquidar"."anticipos"."es_empleado"),
	CONSTRAINT "anticipos_cuotas_solo_al_cobrar" CHECK ("cuentas_por_liquidar"."anticipos"."cuotas" is null or ("cuentas_por_liquidar"."anticipos"."destino_de_no_liquidado" = 'cobrar' and "cuentas_por_liquidar"."anticipos"."cuotas" >= 1)),
	CONSTRAINT "anticipos_motivo_de_lo_no_liquidado" CHECK (("cuentas_por_liquidar"."anticipos"."no_liquidado" > 0) = ("cuentas_por_liquidar"."anticipos"."motivo_de_no_liquidado" is not null)),
	CONSTRAINT "anticipos_motivo_de_lo_no_liquidado_rango" CHECK (("cuentas_por_liquidar"."anticipos"."motivo_de_no_liquidado" is null or (char_length("cuentas_por_liquidar"."anticipos"."motivo_de_no_liquidado") between 1 and 300 and "cuentas_por_liquidar"."anticipos"."motivo_de_no_liquidado" = btrim("cuentas_por_liquidar"."anticipos"."motivo_de_no_liquidado")))),
	CONSTRAINT "anticipos_anulacion_completa" CHECK (("cuentas_por_liquidar"."anticipos"."estado" = 'anulado') = ("cuentas_por_liquidar"."anticipos"."anulado_en" is not null) and ("cuentas_por_liquidar"."anticipos"."anulado_en" is not null) = ("cuentas_por_liquidar"."anticipos"."anulado_por" is not null) and ("cuentas_por_liquidar"."anticipos"."anulado_por" is not null) = ("cuentas_por_liquidar"."anticipos"."motivo_de_anulacion" is not null)),
	CONSTRAINT "anticipos_motivo_de_anulacion_rango" CHECK ("cuentas_por_liquidar"."anticipos"."motivo_de_anulacion" is null or char_length("cuentas_por_liquidar"."anticipos"."motivo_de_anulacion") between 1 and 300),
	CONSTRAINT "anticipos_fecha_de_anulacion_de_su_estado" CHECK (("cuentas_por_liquidar"."anticipos"."estado" = 'anulado') = ("cuentas_por_liquidar"."anticipos"."fecha_de_anulacion" is not null)),
	CONSTRAINT "anticipos_fecha_de_anulacion_valida" CHECK ("cuentas_por_liquidar"."anticipos"."fecha_de_anulacion" is null or "cuentas_por_liquidar"."anticipos"."fecha_de_anulacion" >= "cuentas_por_liquidar"."anticipos"."fecha")
);
--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."anticipos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cuentas_por_liquidar"."gastos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"anticipo_id" uuid,
	"clase" text NOT NULL,
	"documento_de_compra_id" uuid,
	"resta" boolean DEFAULT false NOT NULL,
	"proveedor_id" uuid,
	"fecha" date NOT NULL,
	"monto" numeric(14, 2) NOT NULL,
	"con_activo_fijo" boolean DEFAULT false NOT NULL,
	"descripcion" text,
	"pagado_a" text,
	"concepto_de_gasto_id" uuid,
	"motivo_sin_documento" text,
	"tratamiento_sin_documento" text,
	"sin_bancarizar" boolean DEFAULT false NOT NULL,
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
	CONSTRAINT "gastos_clase_valida" CHECK ("cuentas_por_liquidar"."gastos"."clase" in ('documento', 'sin_documento')),
	CONSTRAINT "gastos_documento_de_su_clase" CHECK (("cuentas_por_liquidar"."gastos"."clase" = 'documento') = ("cuentas_por_liquidar"."gastos"."documento_de_compra_id" is not null)),
	CONSTRAINT "gastos_documento_con_proveedor" CHECK ("cuentas_por_liquidar"."gastos"."clase" <> 'documento' or "cuentas_por_liquidar"."gastos"."proveedor_id" is not null),
	CONSTRAINT "gastos_sin_documento_exige_anticipo" CHECK ("cuentas_por_liquidar"."gastos"."clase" = 'documento' or "cuentas_por_liquidar"."gastos"."anticipo_id" is not null),
	CONSTRAINT "gastos_monto_positivo" CHECK ("cuentas_por_liquidar"."gastos"."monto" > 0),
	CONSTRAINT "gastos_resta_solo_en_documentos" CHECK (not "cuentas_por_liquidar"."gastos"."resta" or "cuentas_por_liquidar"."gastos"."clase" = 'documento'),
	CONSTRAINT "gastos_asignacion_completa" CHECK (("cuentas_por_liquidar"."gastos"."anticipo_id" is null) = ("cuentas_por_liquidar"."gastos"."asignado_en" is null) and ("cuentas_por_liquidar"."gastos"."asignado_en" is null) = ("cuentas_por_liquidar"."gastos"."asignado_por" is null)),
	CONSTRAINT "gastos_estado_valido" CHECK ("cuentas_por_liquidar"."gastos"."estado" in ('vigente', 'anulado')),
	CONSTRAINT "gastos_descripcion_obligatoria" CHECK ("cuentas_por_liquidar"."gastos"."clase" = 'documento' or "cuentas_por_liquidar"."gastos"."descripcion" is not null),
	CONSTRAINT "gastos_descripcion_valida" CHECK (("cuentas_por_liquidar"."gastos"."descripcion" is null or (char_length("cuentas_por_liquidar"."gastos"."descripcion") between 1 and 300 and "cuentas_por_liquidar"."gastos"."descripcion" = btrim("cuentas_por_liquidar"."gastos"."descripcion")))),
	CONSTRAINT "gastos_pagado_a_de_su_clase" CHECK (("cuentas_por_liquidar"."gastos"."clase" = 'sin_documento') = ("cuentas_por_liquidar"."gastos"."pagado_a" is not null)),
	CONSTRAINT "gastos_pagado_a_valido" CHECK (("cuentas_por_liquidar"."gastos"."pagado_a" is null or (char_length("cuentas_por_liquidar"."gastos"."pagado_a") between 1 and 150 and "cuentas_por_liquidar"."gastos"."pagado_a" = btrim("cuentas_por_liquidar"."gastos"."pagado_a")))),
	CONSTRAINT "gastos_concepto_del_gasto" CHECK ("cuentas_por_liquidar"."gastos"."clase" <> 'sin_documento' or "cuentas_por_liquidar"."gastos"."concepto_de_gasto_id" is not null),
	CONSTRAINT "gastos_motivo_sin_documento_de_su_clase" CHECK (("cuentas_por_liquidar"."gastos"."clase" = 'sin_documento') = ("cuentas_por_liquidar"."gastos"."motivo_sin_documento" is not null)),
	CONSTRAINT "gastos_motivo_sin_documento_rango" CHECK (("cuentas_por_liquidar"."gastos"."motivo_sin_documento" is null or (char_length("cuentas_por_liquidar"."gastos"."motivo_sin_documento") between 1 and 300 and "cuentas_por_liquidar"."gastos"."motivo_sin_documento" = btrim("cuentas_por_liquidar"."gastos"."motivo_sin_documento")))),
	CONSTRAINT "gastos_tratamiento_de_su_clase" CHECK (("cuentas_por_liquidar"."gastos"."clase" = 'sin_documento') = ("cuentas_por_liquidar"."gastos"."tratamiento_sin_documento" is not null)),
	CONSTRAINT "gastos_tratamiento_valido" CHECK ("cuentas_por_liquidar"."gastos"."tratamiento_sin_documento" is null or "cuentas_por_liquidar"."gastos"."tratamiento_sin_documento" in ('no_deducible', 'renta_del_trabajo')),
	CONSTRAINT "gastos_anulacion_completa" CHECK (("cuentas_por_liquidar"."gastos"."estado" = 'anulado') = ("cuentas_por_liquidar"."gastos"."anulado_en" is not null) and ("cuentas_por_liquidar"."gastos"."anulado_en" is not null) = ("cuentas_por_liquidar"."gastos"."anulado_por" is not null) and ("cuentas_por_liquidar"."gastos"."anulado_por" is not null) = ("cuentas_por_liquidar"."gastos"."motivo_de_anulacion" is not null)),
	CONSTRAINT "gastos_motivo_de_anulacion_rango" CHECK ("cuentas_por_liquidar"."gastos"."motivo_de_anulacion" is null or char_length("cuentas_por_liquidar"."gastos"."motivo_de_anulacion") between 1 and 300),
	CONSTRAINT "gastos_fecha_de_anulacion_de_su_estado" CHECK (("cuentas_por_liquidar"."gastos"."estado" = 'anulado') = ("cuentas_por_liquidar"."gastos"."fecha_de_anulacion" is not null)),
	CONSTRAINT "gastos_fecha_de_anulacion_valida" CHECK ("cuentas_por_liquidar"."gastos"."fecha_de_anulacion" is null or "cuentas_por_liquidar"."gastos"."fecha_de_anulacion" >= "cuentas_por_liquidar"."gastos"."fecha")
);
--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."gastos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."anticipos" ADD CONSTRAINT "anticipos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."anticipos" ADD CONSTRAINT "anticipos_beneficiario_id_terceros_id_fk" FOREIGN KEY ("beneficiario_id") REFERENCES "terceros"."terceros"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."anticipos" ADD CONSTRAINT "anticipos_beneficiario_usuario_id_usuarios_id_fk" FOREIGN KEY ("beneficiario_usuario_id") REFERENCES "core"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."anticipos" ADD CONSTRAINT "anticipos_movimiento_id_movimientos_id_fk" FOREIGN KEY ("movimiento_id") REFERENCES "bancos"."movimientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."anticipos" ADD CONSTRAINT "anticipos_movimiento_de_devolucion_id_movimientos_id_fk" FOREIGN KEY ("movimiento_de_devolucion_id") REFERENCES "bancos"."movimientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."anticipos" ADD CONSTRAINT "anticipos_movimiento_de_reembolso_id_movimientos_id_fk" FOREIGN KEY ("movimiento_de_reembolso_id") REFERENCES "bancos"."movimientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."anticipos" ADD CONSTRAINT "anticipos_localidad_fk" FOREIGN KEY ("localidad_id","empresa_id") REFERENCES "empresas"."localidades"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."gastos" ADD CONSTRAINT "gastos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."gastos" ADD CONSTRAINT "gastos_documento_de_compra_id_documentos_id_fk" FOREIGN KEY ("documento_de_compra_id") REFERENCES "libro_de_compras"."documentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."gastos" ADD CONSTRAINT "gastos_proveedor_id_proveedores_id_fk" FOREIGN KEY ("proveedor_id") REFERENCES "terceros"."proveedores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."gastos" ADD CONSTRAINT "gastos_anticipo_fk" FOREIGN KEY ("anticipo_id","empresa_id") REFERENCES "cuentas_por_liquidar"."anticipos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."gastos" ADD CONSTRAINT "gastos_concepto_de_gasto_fk" FOREIGN KEY ("concepto_de_gasto_id","empresa_id") REFERENCES "libro_de_compras"."conceptos_de_gasto"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "anticipos_devolucion_unica" ON "cuentas_por_liquidar"."anticipos" USING btree ("movimiento_de_devolucion_id") WHERE "cuentas_por_liquidar"."anticipos"."movimiento_de_devolucion_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "anticipos_reembolso_unico" ON "cuentas_por_liquidar"."anticipos" USING btree ("movimiento_de_reembolso_id") WHERE "cuentas_por_liquidar"."anticipos"."movimiento_de_reembolso_id" is not null;--> statement-breakpoint
CREATE INDEX "anticipos_lista_idx" ON "cuentas_por_liquidar"."anticipos" USING btree ("empresa_id","estado","fecha_limite");--> statement-breakpoint
CREATE INDEX "anticipos_beneficiario_idx" ON "cuentas_por_liquidar"."anticipos" USING btree ("beneficiario_id","estado");--> statement-breakpoint
CREATE INDEX "anticipos_beneficiario_usuario_idx" ON "cuentas_por_liquidar"."anticipos" USING btree ("beneficiario_usuario_id") WHERE "cuentas_por_liquidar"."anticipos"."beneficiario_usuario_id" is not null;--> statement-breakpoint
CREATE INDEX "anticipos_localidad_idx" ON "cuentas_por_liquidar"."anticipos" USING btree ("localidad_id") WHERE "cuentas_por_liquidar"."anticipos"."localidad_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "gastos_documento_unico" ON "cuentas_por_liquidar"."gastos" USING btree ("documento_de_compra_id") WHERE "cuentas_por_liquidar"."gastos"."documento_de_compra_id" is not null;--> statement-breakpoint
CREATE INDEX "gastos_anticipo_idx" ON "cuentas_por_liquidar"."gastos" USING btree ("anticipo_id");--> statement-breakpoint
CREATE INDEX "gastos_bandeja_idx" ON "cuentas_por_liquidar"."gastos" USING btree ("empresa_id") WHERE "cuentas_por_liquidar"."gastos"."anticipo_id" is null and "cuentas_por_liquidar"."gastos"."estado" = 'vigente';--> statement-breakpoint
CREATE INDEX "gastos_proveedor_fecha_idx" ON "cuentas_por_liquidar"."gastos" USING btree ("proveedor_id","fecha") WHERE "cuentas_por_liquidar"."gastos"."proveedor_id" is not null and "cuentas_por_liquidar"."gastos"."estado" = 'vigente';--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "cuentas_por_liquidar"."anticipos" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "cuentas_por_liquidar"."gastos" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);