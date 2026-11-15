CREATE TABLE "cuentas_por_pagar"."retiros_de_efectivo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"anio_de_numero" integer DEFAULT 0 NOT NULL,
	"forma" text NOT NULL,
	"fecha" date NOT NULL,
	"monto" numeric(14, 2) NOT NULL,
	"movimiento_id" uuid NOT NULL,
	"custodio" text NOT NULL,
	"custodio_usuario_id" uuid,
	"observaciones" text,
	"estado" text DEFAULT 'abierto' NOT NULL,
	"fecha_de_liquidacion" date,
	"liquidado_en" timestamp with time zone,
	"liquidado_por" uuid,
	"devuelto" numeric(14, 2) DEFAULT '0' NOT NULL,
	"movimiento_de_devolucion_id" uuid,
	"faltante" numeric(14, 2) DEFAULT '0' NOT NULL,
	"motivo_de_faltante" text,
	"anulado_en" timestamp with time zone,
	"anulado_por" uuid,
	"motivo_de_anulacion" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "retiros_numero_unico" UNIQUE("empresa_id","anio_de_numero","numero"),
	CONSTRAINT "retiros_movimiento_unico" UNIQUE("movimiento_id"),
	CONSTRAINT "retiros_llave_unica" UNIQUE("id","empresa_id"),
	CONSTRAINT "retiros_numero_positivo" CHECK ("cuentas_por_pagar"."retiros_de_efectivo"."numero" > 0),
	CONSTRAINT "retiros_forma_valida" CHECK ("cuentas_por_pagar"."retiros_de_efectivo"."forma" in ('cheque', 'nota_de_debito')),
	CONSTRAINT "retiros_monto_positivo" CHECK ("cuentas_por_pagar"."retiros_de_efectivo"."monto" > 0),
	CONSTRAINT "retiros_custodio_valido" CHECK (char_length("cuentas_por_pagar"."retiros_de_efectivo"."custodio") between 1 and 150 and "cuentas_por_pagar"."retiros_de_efectivo"."custodio" = btrim("cuentas_por_pagar"."retiros_de_efectivo"."custodio")),
	CONSTRAINT "retiros_observaciones_validas" CHECK ("cuentas_por_pagar"."retiros_de_efectivo"."observaciones" is null or (char_length("cuentas_por_pagar"."retiros_de_efectivo"."observaciones") between 1 and 500 and "cuentas_por_pagar"."retiros_de_efectivo"."observaciones" = btrim("cuentas_por_pagar"."retiros_de_efectivo"."observaciones"))),
	CONSTRAINT "retiros_estado_valido" CHECK ("cuentas_por_pagar"."retiros_de_efectivo"."estado" in ('abierto', 'liquidado', 'anulado')),
	CONSTRAINT "retiros_anulacion_completa" CHECK (("cuentas_por_pagar"."retiros_de_efectivo"."estado" = 'anulado') = ("cuentas_por_pagar"."retiros_de_efectivo"."anulado_en" is not null) and ("cuentas_por_pagar"."retiros_de_efectivo"."anulado_en" is not null) = ("cuentas_por_pagar"."retiros_de_efectivo"."anulado_por" is not null) and ("cuentas_por_pagar"."retiros_de_efectivo"."anulado_por" is not null) = ("cuentas_por_pagar"."retiros_de_efectivo"."motivo_de_anulacion" is not null)),
	CONSTRAINT "retiros_motivo_de_anulacion_rango" CHECK ("cuentas_por_pagar"."retiros_de_efectivo"."motivo_de_anulacion" is null or char_length("cuentas_por_pagar"."retiros_de_efectivo"."motivo_de_anulacion") between 1 and 300),
	CONSTRAINT "retiros_liquidacion_completa" CHECK (("cuentas_por_pagar"."retiros_de_efectivo"."estado" = 'liquidado') = ("cuentas_por_pagar"."retiros_de_efectivo"."fecha_de_liquidacion" is not null) and ("cuentas_por_pagar"."retiros_de_efectivo"."fecha_de_liquidacion" is not null) = ("cuentas_por_pagar"."retiros_de_efectivo"."liquidado_en" is not null) and ("cuentas_por_pagar"."retiros_de_efectivo"."liquidado_en" is not null) = ("cuentas_por_pagar"."retiros_de_efectivo"."liquidado_por" is not null)),
	CONSTRAINT "retiros_devuelto_valido" CHECK ("cuentas_por_pagar"."retiros_de_efectivo"."devuelto" >= 0),
	CONSTRAINT "retiros_faltante_valido" CHECK ("cuentas_por_pagar"."retiros_de_efectivo"."faltante" >= 0),
	CONSTRAINT "retiros_abierto_sin_liquidar" CHECK ("cuentas_por_pagar"."retiros_de_efectivo"."estado" = 'liquidado' or ("cuentas_por_pagar"."retiros_de_efectivo"."devuelto" = 0 and "cuentas_por_pagar"."retiros_de_efectivo"."faltante" = 0 and "cuentas_por_pagar"."retiros_de_efectivo"."movimiento_de_devolucion_id" is null)),
	CONSTRAINT "retiros_devolucion_con_deposito" CHECK (("cuentas_por_pagar"."retiros_de_efectivo"."devuelto" > 0) = ("cuentas_por_pagar"."retiros_de_efectivo"."movimiento_de_devolucion_id" is not null)),
	CONSTRAINT "retiros_liquidacion_no_pasa_del_monto" CHECK ("cuentas_por_pagar"."retiros_de_efectivo"."devuelto" + "cuentas_por_pagar"."retiros_de_efectivo"."faltante" <= "cuentas_por_pagar"."retiros_de_efectivo"."monto"),
	CONSTRAINT "retiros_motivo_de_faltante" CHECK (("cuentas_por_pagar"."retiros_de_efectivo"."faltante" > 0) = ("cuentas_por_pagar"."retiros_de_efectivo"."motivo_de_faltante" is not null)),
	CONSTRAINT "retiros_motivo_de_faltante_rango" CHECK ("cuentas_por_pagar"."retiros_de_efectivo"."motivo_de_faltante" is null or char_length("cuentas_por_pagar"."retiros_de_efectivo"."motivo_de_faltante") between 1 and 300)
);
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."retiros_de_efectivo" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."pagos" DROP CONSTRAINT "pagos_forma_valida";--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."pagos" DROP CONSTRAINT "pagos_movimiento_de_su_forma";--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."pagos" DROP CONSTRAINT "pagos_referencia_de_su_forma";--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."pagos" ADD COLUMN "retiro_id" uuid;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."pagos" ADD COLUMN "recibido_por" text;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."pagos" ADD COLUMN "motivo_sin_bancarizar" text;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."retiros_de_efectivo" ADD CONSTRAINT "retiros_de_efectivo_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."retiros_de_efectivo" ADD CONSTRAINT "retiros_de_efectivo_custodio_usuario_id_usuarios_id_fk" FOREIGN KEY ("custodio_usuario_id") REFERENCES "core"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."retiros_de_efectivo" ADD CONSTRAINT "retiros_movimiento_fk" FOREIGN KEY ("movimiento_id") REFERENCES "bancos"."movimientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."retiros_de_efectivo" ADD CONSTRAINT "retiros_devolucion_fk" FOREIGN KEY ("movimiento_de_devolucion_id") REFERENCES "bancos"."movimientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "retiros_devolucion_unica" ON "cuentas_por_pagar"."retiros_de_efectivo" USING btree ("movimiento_de_devolucion_id") WHERE "cuentas_por_pagar"."retiros_de_efectivo"."movimiento_de_devolucion_id" is not null;--> statement-breakpoint
CREATE INDEX "retiros_custodio_usuario_idx" ON "cuentas_por_pagar"."retiros_de_efectivo" USING btree ("custodio_usuario_id") WHERE "cuentas_por_pagar"."retiros_de_efectivo"."custodio_usuario_id" is not null;--> statement-breakpoint
CREATE INDEX "retiros_lista_idx" ON "cuentas_por_pagar"."retiros_de_efectivo" USING btree ("empresa_id","estado","fecha");--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."pagos" ADD CONSTRAINT "pagos_retiro_fk" FOREIGN KEY ("retiro_id","empresa_id") REFERENCES "cuentas_por_pagar"."retiros_de_efectivo"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pagos_retiro_idx" ON "cuentas_por_pagar"."pagos" USING btree ("retiro_id") WHERE "cuentas_por_pagar"."pagos"."retiro_id" is not null;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."pagos" ADD CONSTRAINT "pagos_retiro_de_su_forma" CHECK (("cuentas_por_pagar"."pagos"."forma" = 'efectivo') = ("cuentas_por_pagar"."pagos"."retiro_id" is not null));--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."pagos" ADD CONSTRAINT "pagos_recibido_por_de_su_forma" CHECK ("cuentas_por_pagar"."pagos"."recibido_por" is null or "cuentas_por_pagar"."pagos"."forma" = 'efectivo');--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."pagos" ADD CONSTRAINT "pagos_recibido_por_valido" CHECK ("cuentas_por_pagar"."pagos"."recibido_por" is null or (char_length("cuentas_por_pagar"."pagos"."recibido_por") between 1 and 150 and "cuentas_por_pagar"."pagos"."recibido_por" = btrim("cuentas_por_pagar"."pagos"."recibido_por")));--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."pagos" ADD CONSTRAINT "pagos_motivo_sin_bancarizar_de_su_forma" CHECK ("cuentas_por_pagar"."pagos"."motivo_sin_bancarizar" is null or "cuentas_por_pagar"."pagos"."forma" = 'efectivo');--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."pagos" ADD CONSTRAINT "pagos_motivo_sin_bancarizar_rango" CHECK ("cuentas_por_pagar"."pagos"."motivo_sin_bancarizar" is null or char_length("cuentas_por_pagar"."pagos"."motivo_sin_bancarizar") between 1 and 300);--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."pagos" ADD CONSTRAINT "pagos_forma_valida" CHECK ("cuentas_por_pagar"."pagos"."forma" in ('cheque', 'nota_de_debito', 'nota_ligada', 'cuenta_de_apertura', 'efectivo'));--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."pagos" ADD CONSTRAINT "pagos_movimiento_de_su_forma" CHECK (("cuentas_por_pagar"."pagos"."forma" in ('cuenta_de_apertura', 'efectivo')) = ("cuentas_por_pagar"."pagos"."movimiento_id" is null));--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."pagos" ADD CONSTRAINT "pagos_referencia_de_su_forma" CHECK ("cuentas_por_pagar"."pagos"."referencia" is null or "cuentas_por_pagar"."pagos"."forma" in ('nota_ligada', 'cuenta_de_apertura', 'efectivo'));--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "cuentas_por_pagar"."retiros_de_efectivo" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);