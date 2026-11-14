CREATE TABLE "cuentas_por_pagar"."aplicaciones_de_pagos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"proveedor_id" uuid NOT NULL,
	"pago_id" uuid NOT NULL,
	"contrasena_id" uuid NOT NULL,
	"cargo_id" uuid NOT NULL,
	"monto" numeric(14, 2) NOT NULL,
	"retencion_descontada" numeric(14, 2) DEFAULT '0' NOT NULL,
	"vigente" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "aplicaciones_de_pagos_par_unico" UNIQUE("pago_id","cargo_id"),
	CONSTRAINT "aplicaciones_de_pagos_monto_positivo" CHECK ("cuentas_por_pagar"."aplicaciones_de_pagos"."monto" > 0),
	CONSTRAINT "aplicaciones_de_pagos_retencion_valida" CHECK ("cuentas_por_pagar"."aplicaciones_de_pagos"."retencion_descontada" >= 0)
);
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."aplicaciones_de_pagos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cuentas_por_pagar"."aplicaciones_de_reintegros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"proveedor_id" uuid NOT NULL,
	"reintegro_id" uuid NOT NULL,
	"nota_id" uuid NOT NULL,
	"monto" numeric(14, 2) NOT NULL,
	"vigente" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "aplicaciones_de_reintegros_par_unico" UNIQUE("reintegro_id","nota_id"),
	CONSTRAINT "aplicaciones_de_reintegros_monto_positivo" CHECK ("cuentas_por_pagar"."aplicaciones_de_reintegros"."monto" > 0)
);
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."aplicaciones_de_reintegros" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cuentas_por_pagar"."pagos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"proveedor_id" uuid NOT NULL,
	"contrasena_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"anio_de_numero" integer DEFAULT 0 NOT NULL,
	"forma" text NOT NULL,
	"fecha" date NOT NULL,
	"monto" numeric(14, 2) NOT NULL,
	"movimiento_id" uuid,
	"referencia" text,
	"motivo" text,
	"con_carga_cerrada" boolean,
	"observaciones" text,
	"estado" text DEFAULT 'vigente' NOT NULL,
	"anulado_en" timestamp with time zone,
	"anulado_por" uuid,
	"motivo_de_anulacion" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "pagos_numero_unico" UNIQUE("empresa_id","anio_de_numero","numero"),
	CONSTRAINT "pagos_llave_unica" UNIQUE("id","empresa_id","proveedor_id","contrasena_id"),
	CONSTRAINT "pagos_numero_positivo" CHECK ("cuentas_por_pagar"."pagos"."numero" > 0),
	CONSTRAINT "pagos_forma_valida" CHECK ("cuentas_por_pagar"."pagos"."forma" in ('cheque', 'nota_de_debito', 'nota_ligada', 'cuenta_de_apertura')),
	CONSTRAINT "pagos_monto_positivo" CHECK ("cuentas_por_pagar"."pagos"."monto" > 0),
	CONSTRAINT "pagos_movimiento_de_su_forma" CHECK (("cuentas_por_pagar"."pagos"."forma" = 'cuenta_de_apertura') = ("cuentas_por_pagar"."pagos"."movimiento_id" is null)),
	CONSTRAINT "pagos_referencia_de_su_forma" CHECK ("cuentas_por_pagar"."pagos"."referencia" is null or "cuentas_por_pagar"."pagos"."forma" in ('nota_ligada', 'cuenta_de_apertura')),
	CONSTRAINT "pagos_referencia_valida" CHECK ("cuentas_por_pagar"."pagos"."referencia" is null or (char_length("cuentas_por_pagar"."pagos"."referencia") between 1 and 100 and "cuentas_por_pagar"."pagos"."referencia" = btrim("cuentas_por_pagar"."pagos"."referencia"))),
	CONSTRAINT "pagos_motivo_de_apertura" CHECK (("cuentas_por_pagar"."pagos"."forma" = 'cuenta_de_apertura') = ("cuentas_por_pagar"."pagos"."motivo" is not null)),
	CONSTRAINT "pagos_motivo_rango" CHECK ("cuentas_por_pagar"."pagos"."motivo" is null or char_length("cuentas_por_pagar"."pagos"."motivo") between 1 and 300),
	CONSTRAINT "pagos_carga_de_apertura" CHECK (("cuentas_por_pagar"."pagos"."forma" = 'cuenta_de_apertura') = ("cuentas_por_pagar"."pagos"."con_carga_cerrada" is not null)),
	CONSTRAINT "pagos_observaciones_validas" CHECK ("cuentas_por_pagar"."pagos"."observaciones" is null or (char_length("cuentas_por_pagar"."pagos"."observaciones") between 1 and 500 and "cuentas_por_pagar"."pagos"."observaciones" = btrim("cuentas_por_pagar"."pagos"."observaciones"))),
	CONSTRAINT "pagos_estado_valido" CHECK ("cuentas_por_pagar"."pagos"."estado" in ('vigente', 'anulado')),
	CONSTRAINT "pagos_anulacion_completa" CHECK (("cuentas_por_pagar"."pagos"."estado" = 'anulado') = ("cuentas_por_pagar"."pagos"."anulado_en" is not null and "cuentas_por_pagar"."pagos"."anulado_por" is not null and "cuentas_por_pagar"."pagos"."motivo_de_anulacion" is not null)),
	CONSTRAINT "pagos_motivo_de_anulacion_rango" CHECK ("cuentas_por_pagar"."pagos"."motivo_de_anulacion" is null or char_length("cuentas_por_pagar"."pagos"."motivo_de_anulacion") between 1 and 300)
);
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."pagos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cuentas_por_pagar"."reintegros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"proveedor_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"anio_de_numero" integer DEFAULT 0 NOT NULL,
	"forma" text NOT NULL,
	"fecha" date NOT NULL,
	"monto" numeric(14, 2) NOT NULL,
	"movimiento_id" uuid,
	"referencia" text,
	"observaciones" text,
	"estado" text DEFAULT 'vigente' NOT NULL,
	"anulado_en" timestamp with time zone,
	"anulado_por" uuid,
	"motivo_de_anulacion" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "reintegros_numero_unico" UNIQUE("empresa_id","anio_de_numero","numero"),
	CONSTRAINT "reintegros_id_proveedor_unico" UNIQUE("id","empresa_id","proveedor_id"),
	CONSTRAINT "reintegros_numero_positivo" CHECK ("cuentas_por_pagar"."reintegros"."numero" > 0),
	CONSTRAINT "reintegros_forma_valida" CHECK ("cuentas_por_pagar"."reintegros"."forma" in ('deposito', 'efectivo')),
	CONSTRAINT "reintegros_monto_positivo" CHECK ("cuentas_por_pagar"."reintegros"."monto" > 0),
	CONSTRAINT "reintegros_movimiento_de_su_forma" CHECK (("cuentas_por_pagar"."reintegros"."forma" = 'deposito') = ("cuentas_por_pagar"."reintegros"."movimiento_id" is not null)),
	CONSTRAINT "reintegros_referencia_en_efectivo" CHECK ("cuentas_por_pagar"."reintegros"."forma" <> 'efectivo' or "cuentas_por_pagar"."reintegros"."referencia" is not null),
	CONSTRAINT "reintegros_referencia_valida" CHECK ("cuentas_por_pagar"."reintegros"."referencia" is null or (char_length("cuentas_por_pagar"."reintegros"."referencia") between 1 and 100 and "cuentas_por_pagar"."reintegros"."referencia" = btrim("cuentas_por_pagar"."reintegros"."referencia"))),
	CONSTRAINT "reintegros_observaciones_validas" CHECK ("cuentas_por_pagar"."reintegros"."observaciones" is null or (char_length("cuentas_por_pagar"."reintegros"."observaciones") between 1 and 500 and "cuentas_por_pagar"."reintegros"."observaciones" = btrim("cuentas_por_pagar"."reintegros"."observaciones"))),
	CONSTRAINT "reintegros_estado_valido" CHECK ("cuentas_por_pagar"."reintegros"."estado" in ('vigente', 'anulado')),
	CONSTRAINT "reintegros_anulacion_completa" CHECK (("cuentas_por_pagar"."reintegros"."estado" = 'anulado') = ("cuentas_por_pagar"."reintegros"."anulado_en" is not null and "cuentas_por_pagar"."reintegros"."anulado_por" is not null and "cuentas_por_pagar"."reintegros"."motivo_de_anulacion" is not null)),
	CONSTRAINT "reintegros_motivo_de_anulacion_rango" CHECK ("cuentas_por_pagar"."reintegros"."motivo_de_anulacion" is null or char_length("cuentas_por_pagar"."reintegros"."motivo_de_anulacion") between 1 and 300)
);
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."reintegros" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."ajustes_de_saldo" ADD COLUMN "pago_id" uuid;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."aplicaciones_de_pagos" ADD CONSTRAINT "aplicaciones_de_pagos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."aplicaciones_de_pagos" ADD CONSTRAINT "aplicaciones_de_pagos_pago_fk" FOREIGN KEY ("pago_id","empresa_id","proveedor_id","contrasena_id") REFERENCES "cuentas_por_pagar"."pagos"("id","empresa_id","proveedor_id","contrasena_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."aplicaciones_de_pagos" ADD CONSTRAINT "aplicaciones_de_pagos_cargo_fk" FOREIGN KEY ("cargo_id","empresa_id","proveedor_id") REFERENCES "cuentas_por_pagar"."documentos"("id","empresa_id","proveedor_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."aplicaciones_de_pagos" ADD CONSTRAINT "aplicaciones_de_pagos_en_la_contrasena_fk" FOREIGN KEY ("contrasena_id","cargo_id") REFERENCES "cuentas_por_pagar"."contrasena_documentos"("contrasena_id","documento_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."aplicaciones_de_reintegros" ADD CONSTRAINT "aplicaciones_de_reintegros_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."aplicaciones_de_reintegros" ADD CONSTRAINT "aplicaciones_de_reintegros_reintegro_fk" FOREIGN KEY ("reintegro_id","empresa_id","proveedor_id") REFERENCES "cuentas_por_pagar"."reintegros"("id","empresa_id","proveedor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."aplicaciones_de_reintegros" ADD CONSTRAINT "aplicaciones_de_reintegros_nota_fk" FOREIGN KEY ("nota_id","empresa_id","proveedor_id") REFERENCES "cuentas_por_pagar"."documentos"("id","empresa_id","proveedor_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."pagos" ADD CONSTRAINT "pagos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."pagos" ADD CONSTRAINT "pagos_contrasena_fk" FOREIGN KEY ("contrasena_id","empresa_id","proveedor_id") REFERENCES "cuentas_por_pagar"."contrasenas"("id","empresa_id","proveedor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."pagos" ADD CONSTRAINT "pagos_movimiento_fk" FOREIGN KEY ("movimiento_id") REFERENCES "bancos"."movimientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."reintegros" ADD CONSTRAINT "reintegros_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."reintegros" ADD CONSTRAINT "reintegros_proveedor_fk" FOREIGN KEY ("proveedor_id") REFERENCES "terceros"."proveedores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."reintegros" ADD CONSTRAINT "reintegros_movimiento_fk" FOREIGN KEY ("movimiento_id") REFERENCES "bancos"."movimientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "aplicaciones_de_pagos_retencion_una_vez" ON "cuentas_por_pagar"."aplicaciones_de_pagos" USING btree ("cargo_id") WHERE "cuentas_por_pagar"."aplicaciones_de_pagos"."vigente" and "cuentas_por_pagar"."aplicaciones_de_pagos"."retencion_descontada" > 0;--> statement-breakpoint
CREATE INDEX "aplicaciones_de_pagos_cargo_idx" ON "cuentas_por_pagar"."aplicaciones_de_pagos" USING btree ("cargo_id") WHERE "cuentas_por_pagar"."aplicaciones_de_pagos"."vigente";--> statement-breakpoint
CREATE INDEX "aplicaciones_de_pagos_contrasena_idx" ON "cuentas_por_pagar"."aplicaciones_de_pagos" USING btree ("contrasena_id","cargo_id");--> statement-breakpoint
CREATE INDEX "aplicaciones_de_pagos_cargo_todas_idx" ON "cuentas_por_pagar"."aplicaciones_de_pagos" USING btree ("cargo_id");--> statement-breakpoint
CREATE INDEX "aplicaciones_de_reintegros_nota_idx" ON "cuentas_por_pagar"."aplicaciones_de_reintegros" USING btree ("nota_id") WHERE "cuentas_por_pagar"."aplicaciones_de_reintegros"."vigente";--> statement-breakpoint
CREATE INDEX "aplicaciones_de_reintegros_nota_todas_idx" ON "cuentas_por_pagar"."aplicaciones_de_reintegros" USING btree ("nota_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pagos_movimiento_creado_unico" ON "cuentas_por_pagar"."pagos" USING btree ("movimiento_id") WHERE "cuentas_por_pagar"."pagos"."forma" in ('cheque', 'nota_de_debito');--> statement-breakpoint
CREATE INDEX "pagos_movimiento_idx" ON "cuentas_por_pagar"."pagos" USING btree ("movimiento_id") WHERE "cuentas_por_pagar"."pagos"."movimiento_id" is not null;--> statement-breakpoint
CREATE INDEX "pagos_contrasena_idx" ON "cuentas_por_pagar"."pagos" USING btree ("contrasena_id");--> statement-breakpoint
CREATE INDEX "pagos_lista_idx" ON "cuentas_por_pagar"."pagos" USING btree ("empresa_id","estado","fecha");--> statement-breakpoint
CREATE UNIQUE INDEX "reintegros_movimiento_unico" ON "cuentas_por_pagar"."reintegros" USING btree ("movimiento_id") WHERE "cuentas_por_pagar"."reintegros"."movimiento_id" is not null;--> statement-breakpoint
CREATE INDEX "reintegros_proveedor_idx" ON "cuentas_por_pagar"."reintegros" USING btree ("proveedor_id");--> statement-breakpoint
CREATE INDEX "reintegros_lista_idx" ON "cuentas_por_pagar"."reintegros" USING btree ("empresa_id","estado","fecha");--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."ajustes_de_saldo" ADD CONSTRAINT "ajustes_pago_fk" FOREIGN KEY ("pago_id") REFERENCES "cuentas_por_pagar"."pagos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ajustes_pago_idx" ON "cuentas_por_pagar"."ajustes_de_saldo" USING btree ("pago_id") WHERE "cuentas_por_pagar"."ajustes_de_saldo"."pago_id" is not null;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."ajustes_de_saldo" ADD CONSTRAINT "ajustes_pago_solo_diferencia" CHECK ("cuentas_por_pagar"."ajustes_de_saldo"."pago_id" is null or "cuentas_por_pagar"."ajustes_de_saldo"."causa" = 'diferencia_menor');--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "cuentas_por_pagar"."aplicaciones_de_pagos" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "cuentas_por_pagar"."aplicaciones_de_reintegros" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "cuentas_por_pagar"."pagos" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "cuentas_por_pagar"."reintegros" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);