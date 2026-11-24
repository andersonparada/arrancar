import { boolean, text, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { nombreNormalizado } from '../../../core/base-datos/nombre-normalizado.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { esquemaParcelas } from './esquema.tablas.js';

/**
 * Los tipos de parcela de cada empresa (potrero, lote, tablón…); la seguridad por empresa (RLS) oculta los de otras.
 * El nombre no repite aunque cambien mayúsculas o tildes.
 */
export const tiposDeParcela = esquemaParcelas.table(
  'tipos_de_parcela',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    nombre: text().notNull(),
    activo: boolean().default(true).notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    uniqueIndex('tipos_de_parcela_nombre_unico').on(t.empresaId, nombreNormalizado(t.nombre)),
    // Destino de la llave compuesta de las parcelas.
    unique('tipos_de_parcela_id_empresa_unico').on(t.id, t.empresaId),
    politicaPorEmpresa(),
  ],
);
