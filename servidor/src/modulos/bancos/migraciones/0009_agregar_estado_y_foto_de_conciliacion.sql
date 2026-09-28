ALTER TABLE "bancos"."conciliaciones" ADD COLUMN "estado" text DEFAULT 'en_proceso' NOT NULL;--> statement-breakpoint
ALTER TABLE "bancos"."conciliaciones" ADD COLUMN "elaborada_por" uuid;--> statement-breakpoint
ALTER TABLE "bancos"."conciliaciones" ADD COLUMN "elaborada_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bancos"."conciliaciones" ADD COLUMN "autorizada_por" uuid;--> statement-breakpoint
ALTER TABLE "bancos"."conciliaciones" ADD COLUMN "autorizada_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bancos"."conciliaciones" ADD COLUMN "foto_saldo_segun_libros" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "bancos"."conciliaciones" ADD COLUMN "foto_saldo_calculado_estado_de_cuenta" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "bancos"."conciliaciones" ADD COLUMN "foto_total_cheques_en_circulacion" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "bancos"."conciliaciones" ADD COLUMN "foto_total_otros_debitos_en_transito" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "bancos"."conciliaciones" ADD COLUMN "foto_total_creditos_en_transito" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "bancos"."conciliaciones" ADD CONSTRAINT "conciliaciones_estado_valido" CHECK ("bancos"."conciliaciones"."estado" in ('en_proceso', 'elaborada', 'autorizada'));