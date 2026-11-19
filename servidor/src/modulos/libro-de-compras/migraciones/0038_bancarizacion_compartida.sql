-- CCL-BZ: el umbral de bancarización pasa a ser del libro (lo comparten Cuentas por pagar, Caja chica y Cuentas por
-- liquidar). Copia a la clave nueva lo que soporte haya fijado en la instalación con la clave vieja. Repetible: si la
-- clave nueva ya tiene valor, no la toca. La clave vieja queda sin uso.
INSERT INTO core.configuraciones (nivel, clave, valor, actualizado_por, actualizado_en)
SELECT 'instalacion', 'libro-de-compras.bancarizacion.umbral', valor, actualizado_por, actualizado_en
FROM core.configuraciones
WHERE nivel = 'instalacion' AND clave = 'cuentas-por-pagar.bancarizacion.umbral'
ON CONFLICT (clave) WHERE nivel = 'instalacion' DO NOTHING;
