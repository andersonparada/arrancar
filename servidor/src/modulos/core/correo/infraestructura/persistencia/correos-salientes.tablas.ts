import { sql } from 'drizzle-orm';
import { pgPolicy, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import {
  autoria,
  deLaTransaccion,
  empresaDeLaTransaccion,
  idPrimario,
  marcasDeTiempo,
  rolAplicacion,
} from '../../../base-datos/columnas.js';
import { archivos } from '../../../archivos/infraestructura/persistencia/archivos.tablas.js';
import { cuentas } from '../../../cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../../cuentas/infraestructura/persistencia/empresas.tablas.js';
import type { EstadoDeCorreo } from './estados-de-correo.js';
import {
  indicesDeCorreos,
  restriccionesDelContenido,
  restriccionesDelEstado,
} from './correos-salientes.restricciones.js';
import { esquemaCore } from '../../../compartido/infraestructura/persistencia/esquema-core.tablas.js';

const porEmpresa = sql.raw(`empresa_id = ${empresaDeLaTransaccion}`);

/**
 * Bandeja de salida y bitácora de envíos (C3, C13). Un correo se inserta en la misma transacción que la
 * operación de negocio que lo pide; un trabajador del proceso lo envía después. La app solo lee, inserta y
 * actualiza dentro de su empresa (RLS), **nunca borra**: el trabajador y la depuración usan funciones
 * `security definer` (`core.tomar_correos_pendientes`, `core.resolver_correo`, `core.depurar_correos`).
 * `registro_origen_id` no tiene llave foránea: core no apunta a tablas de los módulos.
 */
export const correosSalientes = esquemaCore.table(
  'correos_salientes',
  {
    id: idPrimario(),
    cuentaId: uuid()
      .notNull()
      .default(deLaTransaccion.cuenta())
      .references(() => cuentas.id, { onDelete: 'cascade' }),
    empresaId: uuid()
      .notNull()
      .default(deLaTransaccion.empresa())
      .references(() => empresas.id, { onDelete: 'cascade' }),
    tipo: text().notNull(),
    recursoOrigen: text().notNull(),
    registroOrigenId: uuid().notNull(),
    asunto: text().notNull(),
    cuerpoTexto: text(),
    cuerpoHtml: text(),
    responderA: text(),
    nombreVisible: text().notNull(),
    adjuntoArchivoId: uuid().references(() => archivos.id),
    adjuntoNombre: text(),
    adjuntoSha256: text(),
    messageId: text().notNull(),
    estado: text().$type<EstadoDeCorreo>().notNull().default('pendiente'),
    intentos: smallint().notNull().default(0),
    proximoIntento: timestamp({ withTimezone: true }).notNull().defaultNow(),
    bloqueadoHasta: timestamp({ withTimezone: true }),
    enviadoEn: timestamp({ withTimezone: true }),
    ultimoErrorCodigo: text(),
    canceladoEn: timestamp({ withTimezone: true }),
    canceladoPor: uuid(),
    motivoDeCancelacion: text(),
    contenidoDepuradoEn: timestamp({ withTimezone: true }),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    ...indicesDeCorreos(t),
    ...restriccionesDelContenido(t),
    ...restriccionesDelEstado(t),
    // Sin política de borrado: la app no puede borrar correos. Cancelar y reintentar son `update`.
    pgPolicy('leer_en_la_empresa', { as: 'permissive', for: 'select', to: rolAplicacion, using: porEmpresa }),
    pgPolicy('agregar_en_la_empresa', { as: 'permissive', for: 'insert', to: rolAplicacion, withCheck: porEmpresa }),
    pgPolicy('cambiar_en_la_empresa', {
      as: 'permissive',
      for: 'update',
      to: rolAplicacion,
      using: porEmpresa,
      withCheck: porEmpresa,
    }),
  ],
);
