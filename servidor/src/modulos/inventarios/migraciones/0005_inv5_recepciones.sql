CREATE TABLE "inventarios"."descartes_de_lineas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"documento_de_compra_id" uuid NOT NULL,
	"linea_de_documento_id" uuid NOT NULL,
	"motivo" text NOT NULL,
	"quito_la_marca" boolean NOT NULL,
	"vigente" boolean DEFAULT true NOT NULL,
	"devuelto_en" timestamp with time zone,
	"devuelto_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "descartes_de_lineas_motivo_largo" CHECK (char_length(btrim("inventarios"."descartes_de_lineas"."motivo")) between 1 and 300),
	CONSTRAINT "descartes_de_lineas_devolucion" CHECK ((not "inventarios"."descartes_de_lineas"."vigente") = ("inventarios"."descartes_de_lineas"."devuelto_en" is not null))
);
--> statement-breakpoint
ALTER TABLE "inventarios"."descartes_de_lineas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventarios"."repartos_de_costo" (
	"empresa_id" uuid NOT NULL,
	"documento_id" uuid NOT NULL,
	"movimiento_de_entrada_id" uuid NOT NULL,
	"base_del_reparto" text NOT NULL,
	"monto" numeric(14, 2) NOT NULL,
	"absorbido" numeric(14, 2) NOT NULL,
	"a_resultados" numeric(14, 2) NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "repartos_de_costo_pk" PRIMARY KEY("documento_id","movimiento_de_entrada_id"),
	CONSTRAINT "repartos_de_costo_base" CHECK ("inventarios"."repartos_de_costo"."base_del_reparto" in ('valor', 'cantidad', 'peso', 'manual')),
	CONSTRAINT "repartos_de_costo_suma" CHECK ("inventarios"."repartos_de_costo"."absorbido" + "inventarios"."repartos_de_costo"."a_resultados" = "inventarios"."repartos_de_costo"."monto")
);
--> statement-breakpoint
ALTER TABLE "inventarios"."repartos_de_costo" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "inventarios"."documentos" DROP CONSTRAINT "documentos_bodega_obligatoria";--> statement-breakpoint
ALTER TABLE "inventarios"."documentos" DROP CONSTRAINT "documentos_clase_valida";--> statement-breakpoint
ALTER TABLE "inventarios"."descartes_de_lineas" ADD CONSTRAINT "descartes_de_lineas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."descartes_de_lineas" ADD CONSTRAINT "descartes_de_lineas_linea_fk" FOREIGN KEY ("linea_de_documento_id","documento_de_compra_id","empresa_id") REFERENCES "libro_de_compras"."lineas_de_documento"("id","documento_id","empresa_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."repartos_de_costo" ADD CONSTRAINT "repartos_de_costo_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."repartos_de_costo" ADD CONSTRAINT "repartos_de_costo_documento_fk" FOREIGN KEY ("documento_id","empresa_id") REFERENCES "inventarios"."documentos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."repartos_de_costo" ADD CONSTRAINT "repartos_de_costo_entrada_fk" FOREIGN KEY ("movimiento_de_entrada_id","empresa_id") REFERENCES "inventarios"."movimientos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "descartes_de_lineas_vigente_unico" ON "inventarios"."descartes_de_lineas" USING btree ("linea_de_documento_id") WHERE "inventarios"."descartes_de_lineas"."vigente";--> statement-breakpoint
CREATE INDEX "descartes_de_lineas_documento_idx" ON "inventarios"."descartes_de_lineas" USING btree ("documento_de_compra_id");--> statement-breakpoint
CREATE INDEX "repartos_de_costo_entrada_idx" ON "inventarios"."repartos_de_costo" USING btree ("movimiento_de_entrada_id");--> statement-breakpoint
ALTER TABLE "inventarios"."documentos" ADD CONSTRAINT "documentos_bodega_segun_clase" CHECK (("inventarios"."documentos"."clase" = 'rebaja_de_costo') = ("inventarios"."documentos"."bodega_id" is null));--> statement-breakpoint
ALTER TABLE "inventarios"."documentos" ADD CONSTRAINT "documentos_compra_segun_clase" CHECK (("inventarios"."documentos"."clase" in ('recepcion_de_compra', 'devolucion_a_proveedor', 'rebaja_de_costo')) = ("inventarios"."documentos"."documento_de_compra_id" is not null));--> statement-breakpoint
ALTER TABLE "inventarios"."documentos" ADD CONSTRAINT "documentos_clase_valida" CHECK ("inventarios"."documentos"."clase" in ('entrada_manual', 'salida_por_consumo', 'recepcion_de_compra', 'devolucion_a_proveedor', 'rebaja_de_costo'));--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "inventarios"."descartes_de_lineas" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "inventarios"."repartos_de_costo" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);