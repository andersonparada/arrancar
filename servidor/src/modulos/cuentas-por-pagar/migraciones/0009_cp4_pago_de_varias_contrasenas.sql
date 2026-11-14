ALTER TABLE "cuentas_por_pagar"."aplicaciones_de_pagos" DROP CONSTRAINT "aplicaciones_de_pagos_pago_fk";--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."pagos" DROP CONSTRAINT "pagos_llave_unica";--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."pagos" DROP CONSTRAINT "pagos_contrasena_fk";--> statement-breakpoint
DROP INDEX "cuentas_por_pagar"."pagos_contrasena_idx";--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."pagos" DROP COLUMN "contrasena_id";--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."pagos" ADD CONSTRAINT "pagos_id_proveedor_unico" UNIQUE("id","empresa_id","proveedor_id");--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."pagos" ADD CONSTRAINT "pagos_proveedor_fk" FOREIGN KEY ("proveedor_id") REFERENCES "terceros"."proveedores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."aplicaciones_de_pagos" ADD CONSTRAINT "aplicaciones_de_pagos_pago_fk" FOREIGN KEY ("pago_id","empresa_id","proveedor_id") REFERENCES "cuentas_por_pagar"."pagos"("id","empresa_id","proveedor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pagos_proveedor_fecha_idx" ON "cuentas_por_pagar"."pagos" USING btree ("proveedor_id","fecha");
