-- MM-1b (docs/modulos/diseno-multimoneda.md, adenda B.7): guarda de datos existentes. En producción no hay filas
-- `banguat` de otras monedas; si las hay (una base de desarrollo que corrió la carga de MM-3b) se detiene sin borrar
-- nada: el cruce guardado sin su convención ni su dólar no se puede reconstruir.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM core.tipos_de_cambio WHERE origen = 'banguat' AND codigo_banguat <> 2) THEN
    RAISE EXCEPTION 'Hay tipos de cambio del Banguat de monedas distintas del dólar cargados antes de los cruces (adenda B de diseno-multimoneda.md). Recree la base de desarrollo: no se borra nada sola.';
  END IF;
END
$$;
--> statement-breakpoint
ALTER TABLE "core"."consultas_al_banguat" DROP CONSTRAINT "consultas_al_banguat_resultado_valido";
--> statement-breakpoint
ALTER TABLE "core"."monedas_del_banguat" ADD COLUMN "convencion" text;
--> statement-breakpoint
ALTER TABLE "core"."tipos_de_cambio" ADD COLUMN "convencion" text;
--> statement-breakpoint
ALTER TABLE "core"."tipos_de_cambio" ADD COLUMN "dolar_usado_id" uuid;
--> statement-breakpoint
ALTER TABLE "core"."tipos_de_cambio" ADD CONSTRAINT "tipos_de_cambio_dolar_usado_id_tipos_de_cambio_id_fk" FOREIGN KEY ("dolar_usado_id") REFERENCES "core"."tipos_de_cambio"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "tipos_de_cambio_dolar_usado_idx" ON "core"."tipos_de_cambio" USING btree ("dolar_usado_id");
--> statement-breakpoint
-- Las filas del dólar ya cargadas (pruebas o carga por rango) están en quetzales por unidad.
UPDATE "core"."tipos_de_cambio" SET "convencion" = 'quetzales_por_unidad' WHERE "origen" = 'banguat';
--> statement-breakpoint
-- Lista de C-1 con la convención con que publica el Banguat cada código (B.4). Los excluidos (B.8) quedan sin
-- convención: no se ofrecen ni se cargan. La tarea que actualiza la lista nunca toca `convencion`.
INSERT INTO "core"."monedas_del_banguat" ("codigo", "descripcion", "convencion") VALUES
  (1, 'Quetzales', NULL),
  (2, 'Dólares de EE.UU.', 'quetzales_por_unidad'),
  (3, 'Yenes Japoneses', 'unidades_por_usd'),
  (4, 'Francos Belgas', NULL),
  (5, 'Francos Suizos', 'unidades_por_usd'),
  (6, 'Francos Franceses', NULL),
  (7, 'Dólares Canadienses', 'unidades_por_usd'),
  (8, 'Liras Italianas', NULL),
  (9, 'Libras Esterlinas', 'usd_por_unidad'),
  (11, 'Marcos Alemanes', NULL),
  (12, 'Pesetas Españolas', NULL),
  (13, 'Chelines Austríacos', NULL),
  (14, 'Florines Holandeses', NULL),
  (15, 'Coronas Suecas', 'unidades_por_usd'),
  (16, 'Colones Costarricenses', 'unidades_por_usd'),
  (17, 'Colones Salvadoreños', NULL),
  (18, 'Pesos Mexicanos', 'unidades_por_usd'),
  (19, 'Lempiras Hondureños', 'unidades_por_usd'),
  (21, 'Córdobas Nicaragüenses', 'unidades_por_usd'),
  (22, 'Bolivares Venezolanos', NULL),
  (23, 'Corona Danesa', 'unidades_por_usd'),
  (24, 'Euro', 'usd_por_unidad'),
  (25, 'Corona Noruega', 'unidades_por_usd'),
  (26, 'DEG', NULL),
  (27, 'Escudo Portugués', NULL),
  (28, 'Unidad de Cuenta del BID', NULL),
  (29, 'Peso Argentina', 'unidades_por_usd'),
  (30, 'Real Brasileño', 'unidades_por_usd'),
  (31, 'Won Coreano', 'unidades_por_usd'),
  (32, 'Dólar Hong Kong', 'unidades_por_usd'),
  (33, 'Dólar Taiwán', 'unidades_por_usd'),
  (34, 'Yuan China', 'unidades_por_usd'),
  (35, 'Rupia Pakistán', 'unidades_por_usd'),
  (36, 'Rupee India', 'unidades_por_usd'),
  (37, 'Bolivar Fuerte', NULL),
  (38, 'Peso Colombiano', 'unidades_por_usd'),
  (39, 'Peso Dominicano', 'unidades_por_usd'),
  (40, 'Ringgit Malasia', 'unidades_por_usd'),
  (41, 'Bolívar Soberano', NULL),
  (42, 'Zloty', 'unidades_por_usd')
ON CONFLICT ("codigo") DO UPDATE SET "convencion" = EXCLUDED."convencion";
--> statement-breakpoint
-- B.8: el zloty polaco (código 42 del Banguat) faltaba en la semilla; inactivo y sin código, como las demás.
INSERT INTO "core"."monedas" ("codigo", "nombre", "simbolo", "decimales") VALUES ('PLN', 'Zloty polaco', 'zł', 2)
ON CONFLICT ("codigo") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "core"."consultas_al_banguat" ADD CONSTRAINT "consultas_al_banguat_resultado_valido" CHECK ("core"."consultas_al_banguat"."resultado" in ('exito', 'sin_datos', 'error', 'valor_fuera_de_rango', 'valor_ambiguo', 'variacion_excesiva', 'sin_dolar_del_dia', 'convencion_dudosa', 'sin_convencion'));
--> statement-breakpoint
ALTER TABLE "core"."monedas_del_banguat" ADD CONSTRAINT "monedas_del_banguat_convencion_valida" CHECK ("core"."monedas_del_banguat"."convencion" is null or "core"."monedas_del_banguat"."convencion" in ('quetzales_por_unidad', 'usd_por_unidad', 'unidades_por_usd'));
--> statement-breakpoint
ALTER TABLE "core"."tipos_de_cambio" ADD CONSTRAINT "tipos_de_cambio_convencion_valida" CHECK ("core"."tipos_de_cambio"."convencion" is null or "core"."tipos_de_cambio"."convencion" in ('quetzales_por_unidad', 'usd_por_unidad', 'unidades_por_usd'));
--> statement-breakpoint
ALTER TABLE "core"."tipos_de_cambio" ADD CONSTRAINT "tipos_de_cambio_banguat_con_convencion" CHECK ("core"."tipos_de_cambio"."origen" <> 'banguat' or "core"."tipos_de_cambio"."convencion" is not null);
--> statement-breakpoint
ALTER TABLE "core"."tipos_de_cambio" ADD CONSTRAINT "tipos_de_cambio_cruce_con_dolar" CHECK ((coalesce("core"."tipos_de_cambio"."convencion", '') in ('usd_por_unidad', 'unidades_por_usd')) = ("core"."tipos_de_cambio"."dolar_usado_id" is not null));
--> statement-breakpoint
ALTER TABLE "core"."tipos_de_cambio" ADD CONSTRAINT "tipos_de_cambio_cruce_con_compra_y_venta" CHECK (coalesce("core"."tipos_de_cambio"."convencion", '') not in ('usd_por_unidad', 'unidades_por_usd') or ("core"."tipos_de_cambio"."compra" is not null and "core"."tipos_de_cambio"."venta" is not null and "core"."tipos_de_cambio"."venta" >= "core"."tipos_de_cambio"."compra"));
