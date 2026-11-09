-- U8: saldos iniciales de Cuentas por pagar (origen, serie y número propios, saldo al inicio, llave del proveedor y único por documento).
ALTER TABLE "cuentas_por_pagar"."documentos" ADD COLUMN "origen" text DEFAULT 'libro_de_compras' NOT NULL;
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."documentos" ADD COLUMN "serie" text;
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."documentos" ADD COLUMN "saldo_al_inicio" numeric(14, 2);
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."documentos" ADD COLUMN "retenciones_por_practicar" numeric(14, 2);
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."documentos" ADD COLUMN "referencia" text;
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."documentos" ADD COLUMN "numero" text;
--> statement-breakpoint
-- Relleno de serie y número desde el documento del libro (el propietario ve todas las empresas).
UPDATE "cuentas_por_pagar"."documentos" d SET "serie" = l."serie", "numero" = l."numero" FROM "libro_de_compras"."documentos" l WHERE l."id" = d."documento_id";
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."documentos" ALTER COLUMN "numero" SET NOT NULL;
--> statement-breakpoint
-- Revisión previa del único: dice qué pasa en vez del error genérico de índice duplicado.
DO $$
DECLARE repetidos integer;
BEGIN
  SELECT count(*) INTO repetidos FROM (
    SELECT 1 FROM "cuentas_por_pagar"."documentos"
    WHERE "estado" <> 'anulado'
    GROUP BY "empresa_id", "proveedor_id",
      (CASE WHEN "tipo" IN ('factura', 'factura_pequeno_contribuyente', 'factura_pequeno_contribuyente_electronico', 'factura_contribuyente_agropecuario', 'factura_primario_pecuario', 'factura_especial') THEN 'factura' ELSE "tipo" END),
      coalesce("serie", ''), "numero"
    HAVING count(*) > 1
  ) grupos;
  IF repetidos > 0 THEN
    RAISE EXCEPTION 'Hay % documentos por pagar repetidos con distinto tipo de factura: corríjalos en Libro de compras antes de migrar', repetidos;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."documentos" ALTER COLUMN "documento_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."documentos" DROP CONSTRAINT "documentos_nota_con_factura";
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."documentos" ADD CONSTRAINT "documentos_proveedor_por_pagar_fk" FOREIGN KEY ("proveedor_id") REFERENCES "terceros"."proveedores"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "documentos_numero_por_proveedor_unico" ON "cuentas_por_pagar"."documentos" USING btree ("empresa_id","proveedor_id",(case when "tipo" in ('factura', 'factura_pequeno_contribuyente', 'factura_pequeno_contribuyente_electronico', 'factura_contribuyente_agropecuario', 'factura_primario_pecuario', 'factura_especial') then 'factura' else "tipo" end),coalesce("serie", ''),"numero") WHERE "cuentas_por_pagar"."documentos"."estado" <> 'anulado';
--> statement-breakpoint
CREATE INDEX "documentos_proveedor_por_pagar_idx" ON "cuentas_por_pagar"."documentos" USING btree ("proveedor_id");
--> statement-breakpoint
CREATE INDEX "documentos_saldos_iniciales_idx" ON "cuentas_por_pagar"."documentos" USING btree ("empresa_id","proveedor_id","fecha_emision") WHERE "cuentas_por_pagar"."documentos"."origen" = 'saldo_inicial';
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."documentos" ADD CONSTRAINT "documentos_origen_valido" CHECK ("cuentas_por_pagar"."documentos"."origen" in ('libro_de_compras', 'saldo_inicial'));
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."documentos" ADD CONSTRAINT "documentos_origen_y_documento" CHECK (("cuentas_por_pagar"."documentos"."origen" = 'libro_de_compras') = ("cuentas_por_pagar"."documentos"."documento_id" is not null));
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."documentos" ADD CONSTRAINT "documentos_saldo_al_inicio_de_saldos" CHECK (("cuentas_por_pagar"."documentos"."origen" = 'saldo_inicial') = ("cuentas_por_pagar"."documentos"."saldo_al_inicio" is not null));
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."documentos" ADD CONSTRAINT "documentos_saldo_al_inicio_valido" CHECK ("cuentas_por_pagar"."documentos"."saldo_al_inicio" is null or ("cuentas_por_pagar"."documentos"."saldo_al_inicio" > 0 and "cuentas_por_pagar"."documentos"."saldo_al_inicio" <= "cuentas_por_pagar"."documentos"."total" - "cuentas_por_pagar"."documentos"."retenciones"));
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."documentos" ADD CONSTRAINT "documentos_por_practicar_de_saldos" CHECK (("cuentas_por_pagar"."documentos"."origen" = 'saldo_inicial') = ("cuentas_por_pagar"."documentos"."retenciones_por_practicar" is not null));
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."documentos" ADD CONSTRAINT "documentos_por_practicar_valido" CHECK ("cuentas_por_pagar"."documentos"."retenciones_por_practicar" is null or ("cuentas_por_pagar"."documentos"."retenciones_por_practicar" >= 0 and "cuentas_por_pagar"."documentos"."retenciones_por_practicar" <= "cuentas_por_pagar"."documentos"."retenciones"));
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."documentos" ADD CONSTRAINT "documentos_referencia_de_saldos" CHECK ("cuentas_por_pagar"."documentos"."origen" = 'saldo_inicial' or "cuentas_por_pagar"."documentos"."referencia" is null);
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."documentos" ADD CONSTRAINT "documentos_referencia_valida" CHECK ("cuentas_por_pagar"."documentos"."referencia" is null or (char_length("cuentas_por_pagar"."documentos"."referencia") between 1 and 60 and "cuentas_por_pagar"."documentos"."referencia" = btrim("cuentas_por_pagar"."documentos"."referencia")));
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."documentos" ADD CONSTRAINT "documentos_saldo_inicial_sin_nota_afectada" CHECK ("cuentas_por_pagar"."documentos"."origen" = 'libro_de_compras' or "cuentas_por_pagar"."documentos"."documento_afectado_id" is null);
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."documentos" ADD CONSTRAINT "documentos_saldo_inicial_completado" CHECK ("cuentas_por_pagar"."documentos"."origen" = 'libro_de_compras' or "cuentas_por_pagar"."documentos"."estado" in ('registrado', 'autorizado'));
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."documentos" ADD CONSTRAINT "documentos_serie_de_compra_valida" CHECK ("cuentas_por_pagar"."documentos"."serie" is null or (char_length(btrim("cuentas_por_pagar"."documentos"."serie")) between 1 and 40 and btrim("cuentas_por_pagar"."documentos"."serie") = upper(btrim("cuentas_por_pagar"."documentos"."serie")) and btrim("cuentas_por_pagar"."documentos"."serie") !~ '\s'));
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."documentos" ADD CONSTRAINT "documentos_numero_de_compra_valido" CHECK (char_length(btrim("cuentas_por_pagar"."documentos"."numero")) between 1 and 40 and btrim("cuentas_por_pagar"."documentos"."numero") = upper(btrim("cuentas_por_pagar"."documentos"."numero")) and btrim("cuentas_por_pagar"."documentos"."numero") !~ '\s');
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."documentos" ADD CONSTRAINT "documentos_nota_con_factura" CHECK ("cuentas_por_pagar"."documentos"."origen" = 'saldo_inicial' or ("cuentas_por_pagar"."documentos"."tipo" in ('nota_de_credito', 'nota_de_debito')) = ("cuentas_por_pagar"."documentos"."documento_afectado_id" is not null));
