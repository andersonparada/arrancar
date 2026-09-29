ALTER TABLE "bancos"."movimientos" ADD COLUMN "numero" integer;--> statement-breakpoint
ALTER TABLE "bancos"."movimientos" ADD COLUMN "anio_de_numero" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "bancos"."transferencias" ADD COLUMN "numero" integer;--> statement-breakpoint
ALTER TABLE "bancos"."transferencias" ADD COLUMN "anio_de_numero" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "movimientos_numero_unico" ON "bancos"."movimientos" USING btree ("empresa_id","tipo","anio_de_numero","numero") WHERE "bancos"."movimientos"."numero" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "transferencias_numero_unico" ON "bancos"."transferencias" USING btree ("empresa_id","anio_de_numero","numero") WHERE "bancos"."transferencias"."numero" is not null;