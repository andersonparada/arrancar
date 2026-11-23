CREATE TABLE "contabilidad"."enlaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"rol" text NOT NULL,
	"llave" text,
	"llave_nombre" text,
	"cuenta_id" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "enlaces_rol_valido" CHECK ("contabilidad"."enlaces"."rol" in ('proveedores', 'iva_credito_fiscal', 'iva_no_acreditable', 'retencion_por_pagar', 'gasto_por_concepto', 'documentos_por_asignar', 'puente_compras_de_activos', 'pagos_por_aplicar', 'saldos_por_regularizar', 'efectivo_para_pagos', 'cuenta_bancaria', 'concepto_bancario', 'isr_sobre_intereses', 'fondos_en_transito', 'apertura_por_regularizar', 'iva_por_rectificar', 'caja_chica', 'anticipos_por_liquidar', 'cuentas_por_cobrar_a_empleados', 'perdidas_no_deducibles', 'otros_ingresos', 'puente_de_apertura', 'activo_fijo', 'depreciacion_acumulada', 'gasto_de_depreciacion', 'construcciones_en_curso', 'resultado_en_venta_de_activos', 'perdida_en_baja_de_activos', 'iva_debito_fiscal', 'cuentas_por_cobrar_otras', 'diferencial_realizado_ganancia', 'diferencial_realizado_perdida', 'diferencial_no_realizado_ganancia', 'diferencial_no_realizado_perdida', 'isr_gasto_corriente', 'isr_por_pagar', 'isr_diferido_resultado', 'isr_diferido_activo', 'isr_diferido_pasivo', 'resultado_del_ejercicio', 'resultados_acumulados', 'ajustes_de_ejercicios_anteriores', 'reserva_legal')),
	CONSTRAINT "enlaces_llave_no_vacia" CHECK ("contabilidad"."enlaces"."llave" is null or char_length(btrim("contabilidad"."enlaces"."llave")) > 0),
	CONSTRAINT "enlaces_nombre_con_llave" CHECK (("contabilidad"."enlaces"."llave" is null) = ("contabilidad"."enlaces"."llave_nombre" is null))
);
--> statement-breakpoint
ALTER TABLE "contabilidad"."enlaces" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "contabilidad"."enlaces" ADD CONSTRAINT "enlaces_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contabilidad"."enlaces" ADD CONSTRAINT "enlaces_cuenta_fk" FOREIGN KEY ("cuenta_id","empresa_id") REFERENCES "contabilidad"."cuentas"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "enlaces_rol_llave_unico" ON "contabilidad"."enlaces" USING btree ("empresa_id","rol",coalesce("llave", ''));--> statement-breakpoint
CREATE INDEX "enlaces_cuenta_idx" ON "contabilidad"."enlaces" USING btree ("cuenta_id");--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "contabilidad"."enlaces" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);