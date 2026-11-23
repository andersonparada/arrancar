import { primaryKey, unique, uuid } from 'drizzle-orm/pg-core';
import { archivos } from '../../../core/archivos/infraestructura/persistencia/archivos.tablas.js';
import { autoria, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { esquemaActivosFijos } from './esquema.tablas.js';

/**
 * El escaneo firmado de cada boleta de traslado (diseño §5.16, I-8 b). Sin llave a `traslados` (`grupo_id` no es único
 * allí): el caso de uso revisa que la boleta exista y no esté anulada. La fila no se borra al anular el traslado. Al
 * reemplazar el escaneo cambia `archivo_id`; quién lo subió es `actualizado_por` y cuándo, `actualizado_en`.
 */
export const boletasFirmadas = esquemaActivosFijos.table(
  'boletas_firmadas',
  {
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    grupoId: uuid().notNull(),
    archivoId: uuid()
      .notNull()
      .references(() => archivos.id),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    primaryKey({ name: 'boletas_firmadas_pk', columns: [t.empresaId, t.grupoId] }),
    unique('boletas_firmadas_archivo_unico').on(t.archivoId),
    politicaPorEmpresa(),
  ],
);
