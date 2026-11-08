-- El número del formulario o la boleta de pago se guarda como lo escribió el usuario (con espacios por dentro y
-- sin mayúsculas forzadas); solo se exige que no tenga espacios en los extremos.
ALTER TABLE "libro_de_compras"."enteros_de_retenciones" DROP CONSTRAINT "enteros_de_retenciones_documento_de_pago";--> statement-breakpoint
ALTER TABLE "libro_de_compras"."enteros_de_retenciones" ADD CONSTRAINT "enteros_de_retenciones_documento_de_pago" CHECK (char_length("libro_de_compras"."enteros_de_retenciones"."documento_de_pago") between 1 and 40 and "libro_de_compras"."enteros_de_retenciones"."documento_de_pago" = btrim("libro_de_compras"."enteros_de_retenciones"."documento_de_pago"));
