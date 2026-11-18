import { and, desc, eq, inArray, type SQL } from 'drizzle-orm';
import { auditoria } from '../../../core/compartido/infraestructura/persistencia/auditoria.tablas.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import type {
  CierreDeCargaInicialDto,
  EntradaDelHistorialDeCargaDto,
  UltimoCierreDto,
} from '../../aplicacion/dto/historial-de-carga.dto.js';
import type { HistorialDeLaCarga } from '../../aplicacion/puertos/historial-de-la-carga.js';
import {
  aCierreGuardado,
  aEntradaDelHistorial,
  aUltimoCierre,
  esCierre,
  type EntradaDeAuditoriaDeCarga,
} from './historial-de-la-carga.mapeador.js';

export const RECURSO_DE_LA_CARGA_INICIAL = 'empresas.cargas-iniciales';

const COLUMNAS = {
  id: auditoria.id,
  accion: auditoria.accion,
  creadoEn: auditoria.creadoEn,
  motivo: auditoria.motivo,
  anterior: auditoria.anterior,
  nombres: usuarios.nombres,
  apellidos: usuarios.apellidos,
};

/** Las entradas de auditoría de la carga de una empresa, de la más nueva a la más vieja. */
async function entradasDe(empresaId: string, ...condiciones: SQL[]): Promise<EntradaDeAuditoriaDeCarga[]> {
  const delaCarga = and(
    eq(auditoria.recurso, RECURSO_DE_LA_CARGA_INICIAL),
    eq(auditoria.registroId, empresaId),
    eq(auditoria.empresaId, empresaId),
    inArray(auditoria.accion, ['cerrar', 'reabrir', 'quitar', 'adjuntar']),
    ...condiciones,
  );
  const filas = await transaccionEnCurso()
    .select(COLUMNAS)
    .from(auditoria)
    .leftJoin(usuarios, eq(usuarios.id, auditoria.usuarioId))
    .where(delaCarga)
    .orderBy(desc(auditoria.creadoEn), desc(auditoria.id));
  return filas.map(({ nombres, apellidos, ...fila }) => ({
    ...fila,
    porNombre: nombres === null ? null : `${nombres} ${apellidos ?? ''}`.trim(),
  }));
}

/** Lee `core.auditoria` (solo se agrega y se lee, por RLS de la cuenta) con la carga de la empresa. */
export class HistorialDeLaCargaDrizzle implements HistorialDeLaCarga {
  async ultimoCierre(empresaId: string): Promise<UltimoCierreDto | null> {
    const cierre = (await entradasDe(empresaId, eq(auditoria.accion, 'cerrar')))[0];
    return cierre ? aUltimoCierre(cierre) : null;
  }

  async listar(empresaId: string): Promise<EntradaDelHistorialDeCargaDto[]> {
    return (await entradasDe(empresaId)).map(aEntradaDelHistorial);
  }

  async cierre(empresaId: string, cierreId: string): Promise<CierreDeCargaInicialDto | null> {
    const entrada = (await entradasDe(empresaId, eq(auditoria.id, cierreId)))[0];
    return entrada && esCierre(entrada) ? aCierreGuardado(entrada) : null;
  }
}
