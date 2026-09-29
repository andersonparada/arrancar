ALTER TABLE "core"."archivos" ALTER COLUMN "ruta_miniatura" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."archivos" ALTER COLUMN "ancho" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."archivos" ALTER COLUMN "alto" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."archivos" ADD COLUMN "clase" text DEFAULT 'imagen' NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."archivos" ADD COLUMN "sha256" text;--> statement-breakpoint
ALTER TABLE "core"."archivos" ADD COLUMN "sha256_recibido" text;--> statement-breakpoint
ALTER TABLE "core"."archivos" ADD COLUMN "paginas" integer;--> statement-breakpoint
ALTER TABLE "core"."archivos" ADD COLUMN "recurso_dueno" text;--> statement-breakpoint
ALTER TABLE "core"."archivos" ADD CONSTRAINT "archivos_clase_valida" CHECK ("core"."archivos"."clase" in ('imagen', 'documento'));--> statement-breakpoint
ALTER TABLE "core"."archivos" ADD CONSTRAINT "archivos_imagen_completa" CHECK ("core"."archivos"."clase" <> 'imagen' or ("core"."archivos"."ruta_miniatura" is not null and "core"."archivos"."ancho" is not null and "core"."archivos"."alto" is not null));