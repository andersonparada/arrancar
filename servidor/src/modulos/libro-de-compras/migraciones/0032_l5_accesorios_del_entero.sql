-- L5 (errores 4 y 5 del QA del 2026-11-01): el entero separa el impuesto (lo que se compara con lo retenido) de los
-- accesorios que se pagan en la misma boleta (multa, intereses y mora). Lo ya registrado era todo impuesto.
ALTER TABLE "libro_de_compras"."enteros_de_retenciones" RENAME COLUMN "monto" TO "impuesto";--> statement-breakpoint
ALTER TABLE "libro_de_compras"."enteros_de_retenciones" DROP CONSTRAINT "enteros_de_retenciones_monto_positivo";--> statement-breakpoint
ALTER TABLE "libro_de_compras"."enteros_de_retenciones" ADD COLUMN "multa" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."enteros_de_retenciones" ADD COLUMN "intereses" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."enteros_de_retenciones" ADD COLUMN "mora" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."enteros_de_retenciones" ADD CONSTRAINT "enteros_de_retenciones_impuesto_positivo" CHECK ("libro_de_compras"."enteros_de_retenciones"."impuesto" > 0);--> statement-breakpoint
ALTER TABLE "libro_de_compras"."enteros_de_retenciones" ADD CONSTRAINT "enteros_de_retenciones_multa_no_negativa" CHECK ("libro_de_compras"."enteros_de_retenciones"."multa" >= 0);--> statement-breakpoint
ALTER TABLE "libro_de_compras"."enteros_de_retenciones" ADD CONSTRAINT "enteros_de_retenciones_intereses_no_negativos" CHECK ("libro_de_compras"."enteros_de_retenciones"."intereses" >= 0);--> statement-breakpoint
ALTER TABLE "libro_de_compras"."enteros_de_retenciones" ADD CONSTRAINT "enteros_de_retenciones_mora_no_negativa" CHECK ("libro_de_compras"."enteros_de_retenciones"."mora" >= 0);