import { sql } from 'drizzle-orm';
import { index, unique, uniqueIndex, type AnyPgColumn } from 'drizzle-orm/pg-core';

/** Las columnas de `anticipos` que usan estos índices. */
type T = Record<
  | 'id'
  | 'empresaId'
  | 'numero'
  | 'anioDeNumero'
  | 'beneficiarioId'
  | 'beneficiarioUsuarioId'
  | 'localidadId'
  | 'fechaLimite'
  | 'movimientoId'
  | 'movimientoDeDevolucionId'
  | 'movimientoDeReembolsoId'
  | 'estado',
  AnyPgColumn
>;

/**
 * Únicos e índices de los anticipos: el número por empresa y año, un movimiento de Bancos por cada cosa que respalda
 * (entrega, devolución, reembolso), la llave que usan los gastos y las búsquedas de la lista y por beneficiario.
 */
export const indicesDeAnticipo = (t: T) => [
  unique('anticipos_numero_unico').on(t.empresaId, t.anioDeNumero, t.numero),
  unique('anticipos_movimiento_unico').on(t.movimientoId),
  // Destino de la llave compuesta de los gastos: el gasto es de un anticipo de su misma empresa.
  unique('anticipos_llave_unica').on(t.id, t.empresaId),
  uniqueIndex('anticipos_devolucion_unica')
    .on(t.movimientoDeDevolucionId)
    .where(sql`${t.movimientoDeDevolucionId} is not null`),
  uniqueIndex('anticipos_reembolso_unico')
    .on(t.movimientoDeReembolsoId)
    .where(sql`${t.movimientoDeReembolsoId} is not null`),
  index('anticipos_lista_idx').on(t.empresaId, t.estado, t.fechaLimite),
  index('anticipos_beneficiario_idx').on(t.beneficiarioId, t.estado),
  index('anticipos_beneficiario_usuario_idx')
    .on(t.beneficiarioUsuarioId)
    .where(sql`${t.beneficiarioUsuarioId} is not null`),
  index('anticipos_localidad_idx')
    .on(t.localidadId)
    .where(sql`${t.localidadId} is not null`),
];
