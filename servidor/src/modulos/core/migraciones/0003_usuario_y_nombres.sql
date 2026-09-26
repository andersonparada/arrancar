DROP INDEX "core"."usuarios_correo_unico";--> statement-breakpoint
ALTER TABLE "core"."usuarios" ALTER COLUMN "correo" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."usuarios" ADD COLUMN "usuario" text;--> statement-breakpoint
ALTER TABLE "core"."usuarios" ADD COLUMN "nombres" text;--> statement-breakpoint
ALTER TABLE "core"."usuarios" ADD COLUMN "apellidos" text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE "core"."usuarios" SET
  "usuario" = (
    SELECT left(rpad(base, greatest(length(base), 3), 'x'), 30)
    FROM (SELECT regexp_replace(lower(split_part("correo", '@', 1)), '[^a-z]', '', 'g') AS base) AS limpio
  ),
  "nombres" = split_part("nombre", ' ', 1),
  "apellidos" = trim(substr("nombre", length(split_part("nombre", ' ', 1)) + 1));--> statement-breakpoint
ALTER TABLE "core"."usuarios" ALTER COLUMN "usuario" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."usuarios" ALTER COLUMN "nombres" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_usuario_unico" ON "core"."usuarios" USING btree ("usuario");--> statement-breakpoint
ALTER TABLE "core"."usuarios" ADD CONSTRAINT "usuarios_usuario_formato" CHECK (usuario ~ '^[a-z]{3,30}$');
