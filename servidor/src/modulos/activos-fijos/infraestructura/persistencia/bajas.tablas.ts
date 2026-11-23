import { date, integer, numeric, smallint, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { archivos } from '../../../core/archivos/infraestructura/persistencia/archivos.tablas.js';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import type { CausaDeBaja, EstadoDeBaja, TipoDeActa } from '../../dominio/tipos-de-baja.js';
import { indicesDeBaja, llavesDeBaja, reglasDeBaja } from './bajas.llaves-y-reglas.js';
import { esquemaActivosFijos } from './esquema.tablas.js';

const dinero = () => numeric({ precision: 14, scale: 2 });

/**
 * Las bajas y ventas de los activos (diseño §5.12). Congelan lo que el activo valía al día de la baja y, en una venta, el
 * resultado contable y fiscal. Nunca se borran: se anulan y quedan como rastro. Los activos que se dan de baja juntos
 * (un principal con sus componentes) comparten el número del acta. Solo `politicaPorEmpresa()`.
 */
export const bajas = esquemaActivosFijos.table(
  'bajas',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    activoId: uuid().notNull(),
    numero: integer().notNull(),
    anioDeNumero: smallint().notNull(),
    fecha: date({ mode: 'string' }).notNull(),
    causa: text().$type<CausaDeBaja>().notNull(),
    descripcion: text().notNull(),
    autorizadaPor: text().notNull(),
    destinoDelBien: text(),
    actaArchivoId: uuid().references(() => archivos.id),
    denunciaArchivoId: uuid().references(() => archivos.id),
    tipoDeActa: text().$type<TipoDeActa>(),
    numeroDeDenuncia: text(),
    inventarioId: uuid(),
    costo: dinero().notNull(),
    depreciacionAcumuladaContable: dinero().notNull(),
    valorEnLibros: dinero().notNull(),
    costoFiscal: dinero().notNull(),
    baseFiscal: dinero().notNull(),
    depreciacionAcumuladaFiscal: dinero().notNull(),
    valorFiscalPorDepreciar: dinero().notNull(),
    cuotaDelMesContable: dinero().notNull().default('0'),
    cuotaDelMesFiscal: dinero().notNull().default('0'),
    comprador: text(),
    nitDelComprador: text(),
    precio: dinero(),
    iva: dinero(),
    serieFel: text(),
    numeroFel: text(),
    autorizacionFel: uuid(),
    resultadoContable: dinero(),
    resultadoFiscal: dinero(),
    estado: text().$type<EstadoDeBaja>().notNull().default('vigente'),
    anuladaEn: timestamp({ withTimezone: true }),
    anuladaPor: uuid(),
    motivoDeAnulacion: text(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    unique('bajas_id_empresa_unico').on(t.id, t.empresaId),
    ...llavesDeBaja(t),
    ...indicesDeBaja(t),
    ...reglasDeBaja(t),
    politicaPorEmpresa(),
  ],
);
