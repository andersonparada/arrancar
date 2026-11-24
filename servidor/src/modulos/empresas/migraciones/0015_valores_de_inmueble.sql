CREATE TABLE "empresas"."valores_de_inmueble" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"inmueble_id" uuid NOT NULL,
	"fuente" text NOT NULL,
	"vigente_desde" date NOT NULL,
	"origen" text NOT NULL,
	"valor_terreno" numeric(14, 2),
	"valor_construcciones" numeric(14, 2),
	"valor_cultivos_permanentes" numeric(14, 2),
	"valor_total" numeric(14, 2) NOT NULL,
	"categoria_iusi" text,
	"documento" text,
	"archivo_id" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "valores_de_inmueble_id_empresa_unico" UNIQUE("id","empresa_id"),
	CONSTRAINT "valores_de_inmueble_fecha_unico" UNIQUE("inmueble_id","fuente","vigente_desde"),
	CONSTRAINT "valores_de_inmueble_fuente_valida" CHECK ("empresas"."valores_de_inmueble"."fuente" in ('matricula_fiscal', 'catastro_municipal')),
	CONSTRAINT "valores_de_inmueble_origen_valido" CHECK ("empresas"."valores_de_inmueble"."origen" in ('avaluo_dicabi', 'avaluo_municipal', 'autoavaluo', 'valuador_autorizado', 'otro')),
	CONSTRAINT "valores_de_inmueble_partes_no_negativas" CHECK (("empresas"."valores_de_inmueble"."valor_terreno" is null or "empresas"."valores_de_inmueble"."valor_terreno" >= 0) and ("empresas"."valores_de_inmueble"."valor_construcciones" is null or "empresas"."valores_de_inmueble"."valor_construcciones" >= 0) and ("empresas"."valores_de_inmueble"."valor_cultivos_permanentes" is null or "empresas"."valores_de_inmueble"."valor_cultivos_permanentes" >= 0)),
	CONSTRAINT "valores_de_inmueble_total_positivo" CHECK ("empresas"."valores_de_inmueble"."valor_total" > 0),
	CONSTRAINT "valores_de_inmueble_total_coherente" CHECK (coalesce("empresas"."valores_de_inmueble"."valor_terreno", 0) + coalesce("empresas"."valores_de_inmueble"."valor_construcciones", 0) + coalesce("empresas"."valores_de_inmueble"."valor_cultivos_permanentes", 0) <= "empresas"."valores_de_inmueble"."valor_total" and ("empresas"."valores_de_inmueble"."valor_terreno" is null or "empresas"."valores_de_inmueble"."valor_construcciones" is null or "empresas"."valores_de_inmueble"."valor_cultivos_permanentes" is null or "empresas"."valores_de_inmueble"."valor_terreno" + "empresas"."valores_de_inmueble"."valor_construcciones" + "empresas"."valores_de_inmueble"."valor_cultivos_permanentes" = "empresas"."valores_de_inmueble"."valor_total")),
	CONSTRAINT "valores_de_inmueble_categoria_valida" CHECK ("empresas"."valores_de_inmueble"."categoria_iusi" is null or ("empresas"."valores_de_inmueble"."categoria_iusi" in ('vivienda', 'residencial', 'mixto', 'comercial', 'otros') and "empresas"."valores_de_inmueble"."fuente" = 'matricula_fiscal')),
	CONSTRAINT "valores_de_inmueble_documento_valido" CHECK ("empresas"."valores_de_inmueble"."documento" is null or char_length(trim("empresas"."valores_de_inmueble"."documento")) between 1 and 150)
);
--> statement-breakpoint
ALTER TABLE "empresas"."valores_de_inmueble" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "empresas"."valores_de_inmueble" ADD CONSTRAINT "valores_de_inmueble_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresas"."valores_de_inmueble" ADD CONSTRAINT "valores_de_inmueble_archivo_id_archivos_id_fk" FOREIGN KEY ("archivo_id") REFERENCES "core"."archivos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresas"."valores_de_inmueble" ADD CONSTRAINT "valores_de_inmueble_inmueble_fk" FOREIGN KEY ("inmueble_id","empresa_id") REFERENCES "empresas"."inmuebles"("id","empresa_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "valores_de_inmueble_serie_idx" ON "empresas"."valores_de_inmueble" USING btree ("inmueble_id","fuente","vigente_desde" desc);--> statement-breakpoint
CREATE UNIQUE INDEX "valores_de_inmueble_archivo_unico" ON "empresas"."valores_de_inmueble" USING btree ("archivo_id") WHERE "empresas"."valores_de_inmueble"."archivo_id" is not null;--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "empresas"."valores_de_inmueble" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);