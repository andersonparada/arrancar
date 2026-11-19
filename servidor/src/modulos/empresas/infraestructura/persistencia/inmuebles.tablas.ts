import { boolean, char, numeric, smallint, text, uuid } from 'drizzle-orm/pg-core';
import { politicaPorAlcanceOpcional } from '../../../core/base-datos/alcance.js';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { departamentos } from '../../../core/geografia/infraestructura/persistencia/geografia.tablas.js';
import { ALCANCE_DE_LOCALIDADES } from './alcance-de-localidades.js';
import { esquemaEmpresas } from './esquema.tablas.js';
import { llavesEIndicesDeInmuebles, restriccionesDeInmuebles } from './inmuebles.restricciones.js';

/**
 * Los inmuebles registrales de cada empresa (fincas inscritas o inmuebles poseídos sin inscribir). Pueden ser de toda
 * la empresa (sin localidad) o de una localidad: se ven los que no tienen localidad y los de las localidades que el
 * usuario ve. Las llaves de otros módulos hacia aquí son `no action`: un inmueble en uso no se elimina, se inactiva.
 * Es por empresa y no por cuenta: cada empresa registra la finca con su propia titularidad.
 */
export const inmuebles = esquemaEmpresas.table(
  'inmuebles',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    nombre: text().notNull(),
    situacionRegistral: text().$type<'inscrito' | 'posesorio'>().notNull(),
    registro: text().$type<'general' | 'segundo'>(),
    numeroDeFinca: text(),
    folio: text(),
    libro: text(),
    departamentoRegistral: char({ length: 2 }).references(() => departamentos.codigo),
    documentoPosesorio: text(),
    titulacionSupletoriaEnTramite: boolean().default(false).notNull(),
    titularidad: text().$type<'propia' | 'copropiedad' | 'de_tercero'>().notNull(),
    porcentajeDeCopropiedad: numeric({ precision: 5, scale: 2 }),
    titular: text(),
    matriculaFiscal: text(),
    administraIusi: text().$type<'dicabi' | 'municipalidad'>(),
    codigoCatastral: text(),
    departamentoCodigo: char({ length: 2 }),
    municipioCodigo: char({ length: 2 }),
    direccion: text(),
    superficieRegistralM2: numeric('superficie_registral_m2', { precision: 14, scale: 2 }),
    cantidadOriginal: numeric({ precision: 16, scale: 4 }),
    unidadOriginal: text().$type<'m2' | 'hectarea' | 'manzana' | 'cuerda' | 'vara_cuadrada' | 'caballeria'>(),
    varasPorLadoDeCuerda: smallint(),
    localidadId: uuid(),
    observaciones: text(),
    activo: boolean().default(true).notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    ...llavesEIndicesDeInmuebles(t),
    ...restriccionesDeInmuebles(t),
    politicaPorEmpresa(),
    politicaPorAlcanceOpcional(ALCANCE_DE_LOCALIDADES, 'localidad_id'),
  ],
);
