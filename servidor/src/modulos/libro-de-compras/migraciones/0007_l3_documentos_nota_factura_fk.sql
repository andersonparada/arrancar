-- La nota de crédito debe apuntar a una factura del mismo proveedor y destino (drizzle-kit no escribe llaves
-- foráneas autorreferentes). Con MATCH SIMPLE, las filas sin documento_afectado_id (no son notas) no se revisan.
ALTER TABLE "libro_de_compras"."documentos" ADD CONSTRAINT "documentos_nota_factura_fk"
  FOREIGN KEY ("documento_afectado_id", "empresa_id", "proveedor_id", "destino")
  REFERENCES "libro_de_compras"."documentos" ("id", "empresa_id", "proveedor_id", "destino")
  ON DELETE no action ON UPDATE no action;
