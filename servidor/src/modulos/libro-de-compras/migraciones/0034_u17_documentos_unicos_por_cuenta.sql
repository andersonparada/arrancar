-- Los documentos de la SAT son únicos por cuenta (antes, en toda la instalación). La restricción del entero que
-- drizzle repetía ya la dejó la 0033 (su snapshot quedó con la anterior; este ya la trae al día).
DROP INDEX "libro_de_compras"."documentos_sat_unico";--> statement-breakpoint
DROP INDEX "libro_de_compras"."documentos_autorizacion_fel_unica";--> statement-breakpoint
CREATE UNIQUE INDEX "documentos_sat_unico" ON "libro_de_compras"."documentos" USING btree ("nit_emisor","tipo","serie","numero","cuenta_id") WHERE "libro_de_compras"."documentos"."estado" = 'vigente' and "libro_de_compras"."documentos"."muestra_en_reportes_sat";--> statement-breakpoint
CREATE UNIQUE INDEX "documentos_autorizacion_fel_unica" ON "libro_de_compras"."documentos" USING btree ("autorizacion_fel","cuenta_id") WHERE "libro_de_compras"."documentos"."estado" = 'vigente' and "libro_de_compras"."documentos"."autorizacion_fel" is not null;
