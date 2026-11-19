import { boolean, date, numeric, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { archivos } from '../../../core/archivos/infraestructura/persistencia/archivos.tablas.js';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import type { ClaseDeCosto, EstadoDeCosto, OrigenDeCosto } from '../../dominio/tipos-de-costo.js';
import { indicesDeCosto, llavesDeCosto, reglasDeCosto } from './costos.llaves-y-reglas.js';
import { esquemaActivosFijos } from './esquema.tablas.js';

/**
 * Los costos que forman el valor de cada activo (diseño §5.4): de una línea del libro, escritos a mano con su soporte
 * o el saldo inicial. El monto va con signo (la nota de crédito resta). Solo `politicaPorEmpresa()`. Nunca se borran:
 * se anulan y quedan como rastro. La Σ de los vigentes de un activo nunca es negativa y la de una línea no pasa de su
 * costo: lo revisa el dominio con candados (la base no puede leer el costo de la línea sin repetir la fórmula del libro).
 */
export const costos = esquemaActivosFijos.table(
  'costos',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    activoId: uuid().notNull(),
    origen: text().$type<OrigenDeCosto>().notNull(),
    claseDeCosto: text().$type<ClaseDeCosto>().notNull(),
    documentoDeCompraId: uuid(),
    lineaDeDocumentoId: uuid(),
    fecha: date({ mode: 'string' }).notNull(),
    monto: numeric({ precision: 14, scale: 2 }).notNull(),
    aplicaAlLibroFiscal: boolean().default(true).notNull(),
    motivoFueraDelLibroFiscal: text(),
    noEsEdificacion: boolean().default(false).notNull(),
    documentoDeSoporte: text(),
    archivoId: uuid().references(() => archivos.id),
    descripcion: text(),
    estado: text().$type<EstadoDeCosto>().notNull().default('vigente'),
    anuladoEn: timestamp({ withTimezone: true }),
    anuladoPor: uuid(),
    motivoDeAnulacion: text(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    unique('costos_id_empresa_unico').on(t.id, t.empresaId),
    ...llavesDeCosto(t),
    ...indicesDeCosto(t),
    ...reglasDeCosto(t),
    politicaPorEmpresa(),
  ],
);
