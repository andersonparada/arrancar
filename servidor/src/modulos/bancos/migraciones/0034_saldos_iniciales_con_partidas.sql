CREATE TABLE "bancos"."saldos_iniciales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"cuenta_bancaria_id" uuid NOT NULL,
	"saldo_segun_libros_anteriores" numeric(14, 2),
	"observaciones" text,
	"evidencia_archivo_id" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "saldos_iniciales_cuenta_unico" UNIQUE("cuenta_bancaria_id"),
	CONSTRAINT "saldos_iniciales_evidencia_unica" UNIQUE("evidencia_archivo_id"),
	CONSTRAINT "saldos_iniciales_observaciones_validas" CHECK ("bancos"."saldos_iniciales"."observaciones" is null or (length("bancos"."saldos_iniciales"."observaciones") between 1 and 500 and "bancos"."saldos_iniciales"."observaciones" = btrim("bancos"."saldos_iniciales"."observaciones")))
);
--> statement-breakpoint
ALTER TABLE "bancos"."saldos_iniciales" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP INDEX "bancos"."movimientos_un_saldo_inicial";--> statement-breakpoint
ALTER TABLE "bancos"."chequeras" ADD COLUMN "de_apertura" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bancos"."conciliaciones" ADD COLUMN "foto_total_cobrados_antes_de_su_fecha" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "bancos"."movimientos" ADD COLUMN "parte_de_apertura" text;--> statement-breakpoint
ALTER TABLE "bancos"."movimientos" ADD COLUMN "saldo_inicial_id" uuid;--> statement-breakpoint
ALTER TABLE "bancos"."saldos_iniciales" ADD CONSTRAINT "saldos_iniciales_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bancos"."saldos_iniciales" ADD CONSTRAINT "saldos_iniciales_cuenta_fk" FOREIGN KEY ("cuenta_bancaria_id") REFERENCES "bancos"."cuentas_bancarias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bancos"."saldos_iniciales" ADD CONSTRAINT "saldos_iniciales_evidencia_fk" FOREIGN KEY ("evidencia_archivo_id") REFERENCES "core"."archivos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bancos"."movimientos" ADD CONSTRAINT "movimientos_saldo_inicial_fk" FOREIGN KEY ("saldo_inicial_id") REFERENCES "bancos"."saldos_iniciales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chequeras_de_apertura_unica" ON "bancos"."chequeras" USING btree ("cuenta_bancaria_id",coalesce("serie", '')) WHERE "bancos"."chequeras"."de_apertura";--> statement-breakpoint
CREATE UNIQUE INDEX "movimientos_un_saldo_del_banco" ON "bancos"."movimientos" USING btree ("cuenta_bancaria_id") WHERE "bancos"."movimientos"."parte_de_apertura" in ('saldo_del_banco', 'saldo_global') and "bancos"."movimientos"."anulado_en" is null;--> statement-breakpoint
CREATE INDEX "movimientos_apertura_idx" ON "bancos"."movimientos" USING btree ("cuenta_bancaria_id","fecha") WHERE "bancos"."movimientos"."saldo_inicial";--> statement-breakpoint
CREATE INDEX "movimientos_saldo_inicial_idx" ON "bancos"."movimientos" USING btree ("saldo_inicial_id");--> statement-breakpoint
-- BS-1, relleno: los saldos iniciales que ya existen (vigentes o anulados a la antigua) quedan como «globales», colgados de
-- una cabecera por cuenta, sin dato de libros anteriores. No cambia ningún monto, fecha, concepto ni conciliación, así que
-- ningún saldo ni documento de conciliación se mueve. Va antes de los checks nuevos, que los exigen completos.
INSERT INTO "bancos"."saldos_iniciales" ("empresa_id", "cuenta_bancaria_id")
SELECT DISTINCT m."empresa_id", m."cuenta_bancaria_id" FROM "bancos"."movimientos" m WHERE m."saldo_inicial"
ON CONFLICT ("cuenta_bancaria_id") DO NOTHING;--> statement-breakpoint
UPDATE "bancos"."movimientos" m
SET "parte_de_apertura" = 'saldo_global', "saldo_inicial_id" = s."id"
FROM "bancos"."saldos_iniciales" s
WHERE m."saldo_inicial" AND m."parte_de_apertura" IS NULL AND s."cuenta_bancaria_id" = m."cuenta_bancaria_id";--> statement-breakpoint
ALTER TABLE "bancos"."chequeras" ADD CONSTRAINT "chequeras_apertura_inactiva" CHECK (not "bancos"."chequeras"."de_apertura" or not "bancos"."chequeras"."activa");--> statement-breakpoint
ALTER TABLE "bancos"."movimientos" ADD CONSTRAINT "movimientos_parte_de_apertura_valida" CHECK ("bancos"."movimientos"."parte_de_apertura" is null or "bancos"."movimientos"."parte_de_apertura" in ('saldo_del_banco', 'cheque_en_circulacion', 'deposito_en_transito', 'debito_en_transito', 'error_del_banco', 'saldo_global', 'cheque_posfechado'));--> statement-breakpoint
ALTER TABLE "bancos"."movimientos" ADD CONSTRAINT "movimientos_apertura_completa" CHECK (("bancos"."movimientos"."parte_de_apertura" is not null) = ("bancos"."movimientos"."saldo_inicial_id" is not null)
        and "bancos"."movimientos"."saldo_inicial" = coalesce("bancos"."movimientos"."parte_de_apertura" <> 'cheque_posfechado', false));--> statement-breakpoint
ALTER TABLE "bancos"."movimientos" ADD CONSTRAINT "movimientos_tipo_de_la_parte" CHECK ("bancos"."movimientos"."parte_de_apertura" is null
        or ("bancos"."movimientos"."parte_de_apertura" in ('saldo_del_banco', 'saldo_global', 'error_del_banco') and "bancos"."movimientos"."tipo" in ('credito', 'debito'))
        or ("bancos"."movimientos"."parte_de_apertura" in ('cheque_en_circulacion', 'cheque_posfechado') and "bancos"."movimientos"."tipo" = 'cheque')
        or ("bancos"."movimientos"."parte_de_apertura" = 'deposito_en_transito' and "bancos"."movimientos"."tipo" = 'credito')
        or ("bancos"."movimientos"."parte_de_apertura" = 'debito_en_transito' and "bancos"."movimientos"."tipo" = 'debito'));--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "bancos"."saldos_iniciales" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
-- BS-1: concepto de sistema «Partidas de apertura anuladas» (mismo que `dominio/conceptos-iniciales.ts`), solo en las
-- empresas que ya tienen catálogo (las demás lo reciben completo al abrir Conceptos). Si la empresa ya tiene uno sin clave
-- con ese nombre, se le pone la clave; si no, se inserta; nunca se duplica ni se pisa.
UPDATE "bancos"."conceptos" c
SET "clave_de_sistema" = 'anulacion_de_apertura'
WHERE c."clave_de_sistema" IS NULL
  AND lower(c."nombre") = lower('Partidas de apertura anuladas')
  AND NOT EXISTS (
    SELECT 1 FROM "bancos"."conceptos" x WHERE x."empresa_id" = c."empresa_id" AND x."clave_de_sistema" = 'anulacion_de_apertura'
  );--> statement-breakpoint
INSERT INTO "bancos"."conceptos"
  ("empresa_id", "clave_de_sistema", "nombre", "aplica_a", "actividad_de_flujo", "grupo_de_flujo",
   "es_cargo_bancario", "pide_datos_de_intereses", "admite_factura", "activo")
SELECT e."id", 'anulacion_de_apertura', 'Partidas de apertura anuladas', 'ambos', 'ninguna', NULL, false, false, false, true
FROM "core"."empresas" e
WHERE EXISTS (SELECT 1 FROM "bancos"."conceptos" c WHERE c."empresa_id" = e."id")
  AND NOT EXISTS (
    SELECT 1 FROM "bancos"."conceptos" c WHERE c."empresa_id" = e."id" AND c."clave_de_sistema" = 'anulacion_de_apertura'
  )
ON CONFLICT DO NOTHING;--> statement-breakpoint
-- BS-1: permisos nuevos (docs/PLAN.md §3.5), por rol y por usuario. Ver la pantalla de saldos iniciales lo recibe quien ya
-- veía las cuentas bancarias (hoy ve el saldo inicial con ese permiso); anular desde ella, quien ya podía anular cheques.
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'bancos.saldos-iniciales.ver' FROM "core"."rol_permisos" WHERE "permiso" = 'bancos.cuentas-bancarias.ver'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'bancos.saldos-iniciales.anular' FROM "core"."rol_permisos" WHERE "permiso" = 'bancos.cheques.anular'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "core"."usuario_permisos" ("cuenta_id", "usuario_id", "permiso")
SELECT "cuenta_id", "usuario_id", 'bancos.saldos-iniciales.ver' FROM "core"."usuario_permisos" WHERE "permiso" = 'bancos.cuentas-bancarias.ver'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "core"."usuario_permisos" ("cuenta_id", "usuario_id", "permiso")
SELECT "cuenta_id", "usuario_id", 'bancos.saldos-iniciales.anular' FROM "core"."usuario_permisos" WHERE "permiso" = 'bancos.cheques.anular'
ON CONFLICT DO NOTHING;