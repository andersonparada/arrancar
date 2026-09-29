ALTER TABLE "bancos"."movimientos" ADD COLUMN "interes_bruto" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "bancos"."movimientos" ADD COLUMN "isr_retenido" numeric(14, 2);--> statement-breakpoint
CREATE INDEX "movimientos_intereses_idx" ON "bancos"."movimientos" USING btree ("empresa_id","fecha") WHERE "bancos"."movimientos"."interes_bruto" is not null;--> statement-breakpoint
ALTER TABLE "bancos"."movimientos" ADD CONSTRAINT "movimientos_intereses_cuadran" CHECK (("bancos"."movimientos"."interes_bruto" is null and "bancos"."movimientos"."isr_retenido" is null)
        or ("bancos"."movimientos"."interes_bruto" is not null and "bancos"."movimientos"."isr_retenido" is not null and "bancos"."movimientos"."tipo" = 'credito'
          and "bancos"."movimientos"."isr_retenido" >= 0 and "bancos"."movimientos"."interes_bruto" = "bancos"."movimientos"."monto" + "bancos"."movimientos"."isr_retenido"));

--> statement-breakpoint
-- H8: el reporte «Intereses y retenciones» tiene sus permisos (docs/PLAN.md §3.5). Los reciben, por rol y por usuario,
-- quienes ya podían ver o exportar el reporte de movimientos.
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'bancos.intereses.ver' FROM "core"."rol_permisos" WHERE "permiso" = 'bancos.movimientos.ver'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'bancos.intereses.exportar' FROM "core"."rol_permisos" WHERE "permiso" = 'bancos.movimientos.exportar'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."usuario_permisos" ("cuenta_id", "usuario_id", "permiso")
SELECT "cuenta_id", "usuario_id", 'bancos.intereses.ver' FROM "core"."usuario_permisos" WHERE "permiso" = 'bancos.movimientos.ver'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."usuario_permisos" ("cuenta_id", "usuario_id", "permiso")
SELECT "cuenta_id", "usuario_id", 'bancos.intereses.exportar' FROM "core"."usuario_permisos" WHERE "permiso" = 'bancos.movimientos.exportar'
ON CONFLICT DO NOTHING;
