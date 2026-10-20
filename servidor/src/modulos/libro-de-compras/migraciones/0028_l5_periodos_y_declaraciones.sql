CREATE TABLE "libro_de_compras"."declaraciones_de_periodos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"periodo" date NOT NULL,
	"secuencia" smallint NOT NULL,
	"evento" text NOT NULL,
	"formulario" text,
	"numero_de_formulario" text,
	"fecha_de_presentacion" date,
	"tipo_de_libro" text,
	"foto" jsonb,
	"diferencia" jsonb,
	"motivo" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "declaraciones_de_periodos_secuencia_unica" UNIQUE("empresa_id","periodo","secuencia"),
	CONSTRAINT "declaraciones_de_periodos_evento_valido" CHECK ("libro_de_compras"."declaraciones_de_periodos"."evento" in ('declaracion', 'reapertura', 'rectificacion')),
	CONSTRAINT "declaraciones_de_periodos_formulario_valido" CHECK ("libro_de_compras"."declaraciones_de_periodos"."formulario" is null or "libro_de_compras"."declaraciones_de_periodos"."formulario" in ('SAT-2237', 'SAT-2046', 'sin_formulario')),
	CONSTRAINT "declaraciones_de_periodos_numero_valido" CHECK ("libro_de_compras"."declaraciones_de_periodos"."numero_de_formulario" is null or ("libro_de_compras"."declaraciones_de_periodos"."numero_de_formulario" ~ '^[A-Za-z0-9]{1,40}$' and "libro_de_compras"."declaraciones_de_periodos"."formulario" <> 'sin_formulario')),
	CONSTRAINT "declaraciones_de_periodos_tipo_valido" CHECK ("libro_de_compras"."declaraciones_de_periodos"."tipo_de_libro" is null or "libro_de_compras"."declaraciones_de_periodos"."tipo_de_libro" in ('completo', 'simplificado')),
	CONSTRAINT "declaraciones_de_periodos_declaracion_completa" CHECK ("libro_de_compras"."declaraciones_de_periodos"."evento" = 'reapertura' or ("libro_de_compras"."declaraciones_de_periodos"."formulario" is not null and "libro_de_compras"."declaraciones_de_periodos"."tipo_de_libro" is not null and "libro_de_compras"."declaraciones_de_periodos"."foto" is not null)),
	CONSTRAINT "declaraciones_de_periodos_reapertura_con_motivo" CHECK ("libro_de_compras"."declaraciones_de_periodos"."evento" <> 'reapertura' or ("libro_de_compras"."declaraciones_de_periodos"."motivo" is not null and "libro_de_compras"."declaraciones_de_periodos"."foto" is null and "libro_de_compras"."declaraciones_de_periodos"."formulario" is null)),
	CONSTRAINT "declaraciones_de_periodos_diferencia_solo_en_rectificacion" CHECK (("libro_de_compras"."declaraciones_de_periodos"."evento" = 'rectificacion') = ("libro_de_compras"."declaraciones_de_periodos"."diferencia" is not null)),
	CONSTRAINT "declaraciones_de_periodos_motivo_valido" CHECK ("libro_de_compras"."declaraciones_de_periodos"."motivo" is null or char_length("libro_de_compras"."declaraciones_de_periodos"."motivo") between 1 and 500),
	CONSTRAINT "declaraciones_de_periodos_foto_acotada" CHECK (pg_column_size("libro_de_compras"."declaraciones_de_periodos"."foto") <= 1048576)
);
--> statement-breakpoint
ALTER TABLE "libro_de_compras"."declaraciones_de_periodos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "libro_de_compras"."periodos" (
	"empresa_id" uuid NOT NULL,
	"periodo" date NOT NULL,
	"estado" text DEFAULT 'abierto' NOT NULL,
	"declarado_en" timestamp with time zone,
	"declarado_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "periodos_empresa_id_periodo_pk" PRIMARY KEY("empresa_id","periodo"),
	CONSTRAINT "periodos_primer_dia_del_mes" CHECK ("libro_de_compras"."periodos"."periodo" = date_trunc('month', "libro_de_compras"."periodos"."periodo")::date),
	CONSTRAINT "periodos_estado_valido" CHECK ("libro_de_compras"."periodos"."estado" in ('abierto', 'declarado')),
	CONSTRAINT "periodos_declarado_completo" CHECK (("libro_de_compras"."periodos"."estado" = 'declarado') = ("libro_de_compras"."periodos"."declarado_en" is not null and "libro_de_compras"."periodos"."declarado_por" is not null))
);
--> statement-breakpoint
ALTER TABLE "libro_de_compras"."periodos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."declaraciones_de_periodos" ADD CONSTRAINT "declaraciones_de_periodos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."declaraciones_de_periodos" ADD CONSTRAINT "declaraciones_de_periodos_periodo_fk" FOREIGN KEY ("empresa_id","periodo") REFERENCES "libro_de_compras"."periodos"("empresa_id","periodo") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."periodos" ADD CONSTRAINT "periodos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "agregar_en_la_empresa" ON "libro_de_compras"."declaraciones_de_periodos" AS PERMISSIVE FOR INSERT TO "arrancar_app" WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "leer_en_la_empresa" ON "libro_de_compras"."declaraciones_de_periodos" AS PERMISSIVE FOR SELECT TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "libro_de_compras"."periodos" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);