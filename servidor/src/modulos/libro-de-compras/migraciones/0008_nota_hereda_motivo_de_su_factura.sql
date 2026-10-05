-- La nota de crédito hereda tal cual el motivo de su factura (también `fuera_de_plazo`): su propia antigüedad
-- no le da motivo, así que el check del plazo real solo se exige a los demás documentos.
ALTER TABLE "libro_de_compras"."documentos" DROP CONSTRAINT "documentos_fuera_de_plazo_real";
--> statement-breakpoint
ALTER TABLE "libro_de_compras"."documentos" ADD CONSTRAINT "documentos_fuera_de_plazo_real" CHECK ("libro_de_compras"."documentos"."tipo" = 'nota_de_credito' or coalesce("libro_de_compras"."documentos"."motivo_sin_credito", '') <> 'fuera_de_plazo'
        or "libro_de_compras"."documentos"."periodo" > (date_trunc('month', "libro_de_compras"."documentos"."fecha_emision") + interval '2 months')::date);
