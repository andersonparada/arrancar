import { boolean, date, integer, numeric, smallint, text, unique, uuid } from 'drizzle-orm/pg-core';
import { archivos } from '../../../core/archivos/infraestructura/persistencia/archivos.tablas.js';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import type { EstadoDeActivo, FormaDeTenencia, OrigenDeActivo, TipoDeRegistro } from '../../dominio/tipos-de-activo.js';
import { indicesDeActivo, llavesDeActivo } from './activos.llaves-e-indices.js';
import { reglasDeActivo } from './activos.reglas-sql.js';
import { esquemaActivosFijos } from './esquema.tablas.js';

/**
 * Los activos de la empresa (diseño §5.3). Sin alcance por localidad: solo `politicaPorEmpresa()` (AF-P2 a). El costo
 * y la depreciación acumulada no se guardan aquí: salen de `costos`, `saldos_iniciales` y `cuotas`.
 */
export const activos = esquemaActivosFijos.table(
  'activos',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    codigo: text().notNull(),
    descripcion: text().notNull(),
    claseId: uuid().notNull(),
    activoPadreId: uuid(),
    tipoDeRegistro: text().$type<TipoDeRegistro>().notNull(),
    origen: text().$type<OrigenDeActivo>(),
    propietario: text(),
    formaDeTenencia: text().$type<FormaDeTenencia>(),
    estado: text().$type<EstadoDeActivo>().notNull(),
    ocioso: boolean().default(false).notNull(),
    ociosoDesde: date({ mode: 'string' }),
    motivoDeOcio: text(),
    fechaDeAdquisicion: date({ mode: 'string' }).notNull(),
    fechaDeInicioDeUso: date({ mode: 'string' }),
    fechaDeBaja: date({ mode: 'string' }),
    porcentajeFiscal: numeric({ precision: 5, scale: 2 }),
    vidaUtilContableMeses: smallint(),
    valorResidual: numeric({ precision: 14, scale: 2 }),
    valorComoGanadoComun: numeric({ precision: 14, scale: 2 }),
    valorDeMatricula: numeric({ precision: 14, scale: 2 }),
    valorCatastral: numeric({ precision: 14, scale: 2 }),
    valoresDelInmuebleCompleto: boolean().default(false).notNull(),
    marca: text(),
    modelo: text(),
    numeroDeSerie: text(),
    placa: text(),
    cantidad: integer().default(1).notNull(),
    enBodega: boolean().default(false).notNull(),
    altaConjuntaId: uuid(),
    localidadId: uuid(),
    departamentoId: uuid(),
    responsable: text(),
    responsableUsuarioId: uuid().references(() => usuarios.id, { onDelete: 'set null' }),
    fotoArchivoId: uuid().references(() => archivos.id),
    observaciones: text(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    unique('activos_id_empresa_unico').on(t.id, t.empresaId),
    ...llavesDeActivo(t),
    ...indicesDeActivo(t),
    ...reglasDeActivo(t),
    politicaPorEmpresa(),
  ],
);
