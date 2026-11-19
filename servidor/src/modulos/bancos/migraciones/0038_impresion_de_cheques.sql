CREATE TABLE "bancos"."formatos_de_cheque" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cuenta_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"base" text NOT NULL,
	"ajustes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"probado_en" timestamp with time zone,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "formatos_de_cheque_nombre_valido" CHECK (char_length(btrim("bancos"."formatos_de_cheque"."nombre")) between 1 and 80),
	CONSTRAINT "formatos_de_cheque_base_valida" CHECK (base in ('voucher_carta_arriba', 'voucher_carta_en_medio', 'cheque_suelto', 'cheque_suelto_casillas'))
);
--> statement-breakpoint
ALTER TABLE "bancos"."formatos_de_cheque" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bancos"."impresiones_de_cheques" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"cheque_id" uuid NOT NULL,
	"movimiento_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"con_cheque" boolean DEFAULT true NOT NULL,
	"motivo" text,
	"lote_id" uuid,
	"formato" jsonb NOT NULL,
	"impreso_en" timestamp with time zone DEFAULT now() NOT NULL,
	"impreso_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid NOT NULL,
	CONSTRAINT "impresiones_de_cheques_tipo_valido" CHECK ("bancos"."impresiones_de_cheques"."tipo" in ('original', 'reimpresion')),
	CONSTRAINT "impresiones_de_cheques_motivo_valido" CHECK ("bancos"."impresiones_de_cheques"."tipo" = 'original' or coalesce(char_length(btrim("bancos"."impresiones_de_cheques"."motivo")) between 1 and 300, false))
);
--> statement-breakpoint
ALTER TABLE "bancos"."impresiones_de_cheques" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bancos"."cheques" DROP CONSTRAINT "cheques_causa_de_anulacion_valida";--> statement-breakpoint
ALTER TABLE "bancos"."chequeras" ADD COLUMN "formato_de_cheque_id" uuid;--> statement-breakpoint
ALTER TABLE "bancos"."chequeras" ADD COLUMN "plantilla_de_cheque" text;--> statement-breakpoint
ALTER TABLE "bancos"."cheques" ADD COLUMN "impreso_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bancos"."movimientos" ADD COLUMN "para_abono_en_cuenta" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bancos"."formatos_de_cheque" ADD CONSTRAINT "formatos_de_cheque_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bancos"."impresiones_de_cheques" ADD CONSTRAINT "impresiones_de_cheques_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bancos"."impresiones_de_cheques" ADD CONSTRAINT "impresiones_de_cheques_cheque_id_cheques_id_fk" FOREIGN KEY ("cheque_id") REFERENCES "bancos"."cheques"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bancos"."impresiones_de_cheques" ADD CONSTRAINT "impresiones_de_cheques_movimiento_id_movimientos_id_fk" FOREIGN KEY ("movimiento_id") REFERENCES "bancos"."movimientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "formatos_de_cheque_cuenta_idx" ON "bancos"."formatos_de_cheque" USING btree ("cuenta_id");--> statement-breakpoint
CREATE UNIQUE INDEX "formatos_de_cheque_nombre_unico" ON "bancos"."formatos_de_cheque" USING btree ("cuenta_id",core.nombre_normalizado("nombre"));--> statement-breakpoint
CREATE INDEX "impresiones_de_cheques_cheque_idx" ON "bancos"."impresiones_de_cheques" USING btree ("cheque_id","impreso_en");--> statement-breakpoint
CREATE INDEX "impresiones_de_cheques_movimiento_idx" ON "bancos"."impresiones_de_cheques" USING btree ("movimiento_id");--> statement-breakpoint
CREATE UNIQUE INDEX "impresiones_de_cheques_un_original" ON "bancos"."impresiones_de_cheques" USING btree ("cheque_id") WHERE "bancos"."impresiones_de_cheques"."tipo" = 'original';--> statement-breakpoint
ALTER TABLE "bancos"."chequeras" ADD CONSTRAINT "chequeras_formato_de_cheque_id_formatos_de_cheque_id_fk" FOREIGN KEY ("formato_de_cheque_id") REFERENCES "bancos"."formatos_de_cheque"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chequeras_formato_idx" ON "bancos"."chequeras" USING btree ("formato_de_cheque_id");--> statement-breakpoint
ALTER TABLE "bancos"."chequeras" ADD CONSTRAINT "chequeras_un_formato" CHECK (not ("bancos"."chequeras"."formato_de_cheque_id" is not null and "bancos"."chequeras"."plantilla_de_cheque" is not null));--> statement-breakpoint
ALTER TABLE "bancos"."chequeras" ADD CONSTRAINT "chequeras_plantilla_valida" CHECK (plantilla_de_cheque is null or plantilla_de_cheque in ('voucher_carta_arriba', 'voucher_carta_en_medio', 'cheque_suelto', 'cheque_suelto_casillas'));--> statement-breakpoint
ALTER TABLE "bancos"."chequeras" ADD CONSTRAINT "chequeras_apertura_sin_formato" CHECK (not "bancos"."chequeras"."de_apertura" or ("bancos"."chequeras"."formato_de_cheque_id" is null and "bancos"."chequeras"."plantilla_de_cheque" is null));--> statement-breakpoint
ALTER TABLE "bancos"."cheques" ADD CONSTRAINT "cheques_inutilizado_sin_movimiento" CHECK ("bancos"."cheques"."causa_de_anulacion" is distinct from 'inutilizado' or "bancos"."cheques"."movimiento_id" is null);--> statement-breakpoint
ALTER TABLE "bancos"."cheques" ADD CONSTRAINT "cheques_causa_de_anulacion_valida" CHECK ("bancos"."cheques"."causa_de_anulacion" is null or "bancos"."cheques"."causa_de_anulacion" in ('manual', 'caducidad', 'inutilizado', 'extraviado'));--> statement-breakpoint
ALTER TABLE "bancos"."movimientos" ADD CONSTRAINT "movimientos_abono_en_cuenta_solo_cheque" CHECK (not "bancos"."movimientos"."para_abono_en_cuenta" or "bancos"."movimientos"."tipo" = 'cheque');--> statement-breakpoint
CREATE POLICY "aislamiento_por_cuenta" ON "bancos"."formatos_de_cheque" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (cuenta_id = nullif(current_setting('app.cuenta_id', true), '')::uuid) WITH CHECK (cuenta_id = nullif(current_setting('app.cuenta_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "agregar_en_la_empresa" ON "bancos"."impresiones_de_cheques" AS PERMISSIVE FOR INSERT TO "arrancar_app" WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "leer_en_la_empresa" ON "bancos"."impresiones_de_cheques" AS PERMISSIVE FOR SELECT TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint

-- IC-1: permisos de la impresión de cheques (docs/modulos/diseno-impresion-de-cheques.md §7), por rol y por usuario. Quien tenía el permiso base recibe el nuevo. Repetible: no duplica nada.
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'bancos.formatos-de-cheque.ver' FROM "core"."rol_permisos" WHERE "permiso" = 'bancos.chequeras.ver'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "core"."usuario_permisos" ("cuenta_id", "usuario_id", "permiso")
SELECT "cuenta_id", "usuario_id", 'bancos.formatos-de-cheque.ver' FROM "core"."usuario_permisos" WHERE "permiso" = 'bancos.chequeras.ver'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'bancos.formatos-de-cheque.crear' FROM "core"."rol_permisos" WHERE "permiso" = 'bancos.chequeras.crear'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "core"."usuario_permisos" ("cuenta_id", "usuario_id", "permiso")
SELECT "cuenta_id", "usuario_id", 'bancos.formatos-de-cheque.crear' FROM "core"."usuario_permisos" WHERE "permiso" = 'bancos.chequeras.crear'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'bancos.formatos-de-cheque.editar' FROM "core"."rol_permisos" WHERE "permiso" = 'bancos.chequeras.editar'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "core"."usuario_permisos" ("cuenta_id", "usuario_id", "permiso")
SELECT "cuenta_id", "usuario_id", 'bancos.formatos-de-cheque.editar' FROM "core"."usuario_permisos" WHERE "permiso" = 'bancos.chequeras.editar'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'bancos.formatos-de-cheque.eliminar' FROM "core"."rol_permisos" WHERE "permiso" = 'bancos.chequeras.editar'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "core"."usuario_permisos" ("cuenta_id", "usuario_id", "permiso")
SELECT "cuenta_id", "usuario_id", 'bancos.formatos-de-cheque.eliminar' FROM "core"."usuario_permisos" WHERE "permiso" = 'bancos.chequeras.editar'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'bancos.cheques.imprimir' FROM "core"."rol_permisos" WHERE "permiso" = 'bancos.cheques.emitir'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "core"."usuario_permisos" ("cuenta_id", "usuario_id", "permiso")
SELECT "cuenta_id", "usuario_id", 'bancos.cheques.imprimir' FROM "core"."usuario_permisos" WHERE "permiso" = 'bancos.cheques.emitir'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'bancos.cheques.reimprimir' FROM "core"."rol_permisos" WHERE "permiso" = 'bancos.cheques.anular'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "core"."usuario_permisos" ("cuenta_id", "usuario_id", "permiso")
SELECT "cuenta_id", "usuario_id", 'bancos.cheques.reimprimir' FROM "core"."usuario_permisos" WHERE "permiso" = 'bancos.cheques.anular'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'bancos.correlativos-de-cheques.ver' FROM "core"."rol_permisos" WHERE "permiso" = 'bancos.chequeras.ver'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "core"."usuario_permisos" ("cuenta_id", "usuario_id", "permiso")
SELECT "cuenta_id", "usuario_id", 'bancos.correlativos-de-cheques.ver' FROM "core"."usuario_permisos" WHERE "permiso" = 'bancos.chequeras.ver'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'bancos.correlativos-de-cheques.exportar' FROM "core"."rol_permisos" WHERE "permiso" = 'bancos.chequeras.exportar'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "core"."usuario_permisos" ("cuenta_id", "usuario_id", "permiso")
SELECT "cuenta_id", "usuario_id", 'bancos.correlativos-de-cheques.exportar' FROM "core"."usuario_permisos" WHERE "permiso" = 'bancos.chequeras.exportar'
ON CONFLICT DO NOTHING;
