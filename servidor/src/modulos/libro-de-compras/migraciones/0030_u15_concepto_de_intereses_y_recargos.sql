-- U15: la lista sugerida de conceptos de gasto suma «Intereses y recargos a proveedores» (gasto financiero, un servicio;
-- sirve a cualquier rubro) y las empresas que ya tienen su catálogo lo reciben aquí. Una empresa con el catálogo vacío no
-- se toca: lo recibe al sembrarse. Si ya tiene un concepto con ese nombre, no se repite.
INSERT INTO "libro_de_compras"."conceptos_de_gasto" ("empresa_id", "nombre", "tipo_por_omision", "es_producto_agropecuario", "es_activo_fijo", "activo")
SELECT DISTINCT "empresa_id", 'Intereses y recargos a proveedores', 'servicio', false, false, true
FROM "libro_de_compras"."conceptos_de_gasto" AS "existente"
WHERE NOT EXISTS (
  SELECT 1 FROM "libro_de_compras"."conceptos_de_gasto" AS "igual"
  WHERE "igual"."empresa_id" = "existente"."empresa_id"
    AND core.nombre_normalizado("igual"."nombre") = core.nombre_normalizado('Intereses y recargos a proveedores')
);
