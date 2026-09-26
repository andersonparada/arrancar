ALTER TABLE "core"."configuraciones" DROP CONSTRAINT "configuraciones_nivel_coherente";--> statement-breakpoint
ALTER TABLE "core"."configuraciones" ALTER COLUMN "cuenta_id" DROP NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "configuraciones_por_instalacion" ON "core"."configuraciones" USING btree ("clave") WHERE nivel = 'instalacion';--> statement-breakpoint
ALTER TABLE "core"."configuraciones" ADD CONSTRAINT "configuraciones_nivel_coherente" CHECK ((nivel = 'instalacion' and cuenta_id is null and empresa_id is null)
        or (nivel = 'cuenta' and cuenta_id is not null and empresa_id is null)
        or (nivel = 'empresa' and cuenta_id is not null and empresa_id is not null));