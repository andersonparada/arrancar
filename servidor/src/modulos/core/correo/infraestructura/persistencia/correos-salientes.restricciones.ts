import { sql } from 'drizzle-orm';
import { check, index, unique, type ExtraConfigColumn } from 'drizzle-orm/pg-core';
import { ESTADOS_DE_CORREO, MAXIMO_DE_INTENTOS } from './estados-de-correo.js';

/** Las columnas de `core.correos_salientes` que revisan estos índices y restricciones. */
type Columnas = Record<
  | 'tipo'
  | 'asunto'
  | 'nombreVisible'
  | 'responderA'
  | 'cuerpoTexto'
  | 'cuerpoHtml'
  | 'contenidoDepuradoEn'
  | 'adjuntoArchivoId'
  | 'adjuntoNombre'
  | 'estado'
  | 'intentos'
  | 'bloqueadoHasta'
  | 'enviadoEn'
  | 'ultimoErrorCodigo'
  | 'canceladoEn'
  | 'motivoDeCancelacion'
  | 'messageId'
  | 'proximoIntento'
  | 'empresaId'
  | 'recursoOrigen'
  | 'registroOrigenId'
  | 'cuentaId'
  | 'creadoEn',
  ExtraConfigColumn
>;

function listaSql(valores: readonly string[]): string {
  return `(${valores.map((valor) => `'${valor}'`).join(', ')})`;
}

export const indicesDeCorreos = (t: Columnas) => [
  unique('correos_salientes_message_id_unico').on(t.messageId),
  unique('correos_salientes_adjunto_unico').on(t.adjuntoArchivoId),
  index('correos_salientes_por_enviar_idx')
    .on(t.proximoIntento)
    .where(sql`${t.estado} in ('pendiente', 'enviando')`),
  index('correos_salientes_origen_idx').on(t.empresaId, t.recursoOrigen, t.registroOrigenId),
  index('correos_salientes_cuenta_fecha_idx').on(t.cuentaId, t.creadoEn),
  index('correos_salientes_empresa_fecha_idx').on(t.empresaId, t.creadoEn.desc()),
  index('correos_salientes_depurar_idx')
    .on(t.creadoEn)
    .where(sql`${t.contenidoDepuradoEn} is null`),
];

export const restriccionesDelContenido = (t: Columnas) => [
  check('correos_salientes_tipo_valido', sql`${t.tipo} ~ '^[a-z-]+\\.[a-z_]+$'`),
  check(
    'correos_salientes_asunto_valido',
    sql`char_length(${t.asunto}) between 1 and 150 and ${t.asunto} !~ '[[:cntrl:]]'`,
  ),
  check(
    'correos_salientes_nombre_visible_valido',
    sql`char_length(${t.nombreVisible}) between 1 and 150 and ${t.nombreVisible} !~ '[[:cntrl:]]'`,
  ),
  check('correos_salientes_responder_a_largo', sql`${t.responderA} is null or char_length(${t.responderA}) <= 254`),
  check(
    'correos_salientes_cuerpo_largo',
    sql`(${t.cuerpoTexto} is null or char_length(${t.cuerpoTexto}) <= 20000) and (${t.cuerpoHtml} is null or char_length(${t.cuerpoHtml}) <= 100000)`,
  ),
  check(
    'correos_salientes_contenido_completo',
    sql`${t.contenidoDepuradoEn} is not null or (${t.cuerpoTexto} is not null and ${t.cuerpoHtml} is not null)`,
  ),
  check(
    'correos_salientes_adjunto_completo',
    sql`(${t.adjuntoArchivoId} is null) = (${t.adjuntoNombre} is null) or ${t.contenidoDepuradoEn} is not null`,
  ),
];

export const restriccionesDelEstado = (t: Columnas) => [
  check('correos_salientes_estado_valido', sql`${t.estado} in ${sql.raw(listaSql(ESTADOS_DE_CORREO))}`),
  check('correos_salientes_intentos_rango', sql`${t.intentos} between 0 and ${sql.raw(String(MAXIMO_DE_INTENTOS))}`),
  check('correos_salientes_arriendo_de_su_estado', sql`(${t.estado} = 'enviando') = (${t.bloqueadoHasta} is not null)`),
  check('correos_salientes_envio_de_su_estado', sql`(${t.estado} = 'enviado') = (${t.enviadoEn} is not null)`),
  check(
    'correos_salientes_cancelacion_completa',
    sql`(${t.estado} = 'cancelado') = (${t.canceladoEn} is not null) and (${t.canceladoEn} is not null) = (${t.motivoDeCancelacion} is not null)`,
  ),
  check(
    'correos_salientes_motivo_de_cancelacion_rango',
    sql`${t.motivoDeCancelacion} is null or char_length(${t.motivoDeCancelacion}) between 1 and 300`,
  ),
  check(
    'correos_salientes_error_solo_codigo',
    sql`${t.ultimoErrorCodigo} is null or ${t.ultimoErrorCodigo} ~ '^[A-Za-z0-9_.-]{1,40}$'`,
  ),
];
