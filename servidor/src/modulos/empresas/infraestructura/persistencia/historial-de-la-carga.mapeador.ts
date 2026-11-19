import type { RevisionDeCierreDeModulo } from '../../../core/contratos/empresas.contratos.js';
import type {
  AccionDelHistorialDeCarga,
  BalanceDelCierreDto,
  CierreDeCargaInicialDto,
  EntradaDelHistorialDeCargaDto,
  UltimoCierreDto,
} from '../../aplicacion/dto/historial-de-carga.dto.js';

/** Una entrada de `core.auditoria` de la carga inicial, con el nombre de quien la hizo. */
export interface EntradaDeAuditoriaDeCarga {
  id: string;
  accion: string;
  creadoEn: Date;
  motivo: string | null;
  anterior: unknown;
  porNombre: string | null;
}

/** Lo que se guarda en `anterior` al cerrar (versión 1): ver `CerrarCargaInicial`. */
interface AnteriorDelCierre {
  version: number;
  carga: { empresaId: string; fechaDeInicio: string };
  revision: { modulos: RevisionDeCierreDeModulo[]; diferencias: number; avisos: number; huella: string };
  balanceDeApertura: BalanceDelCierreDto | null;
}

const VERSION_QUE_SE_SABE_LEER = 1;

/**
 * Lee el `anterior` de un cierre.
 * @throws Error (de programación) si la versión no es una que este código sepa leer: hay que escribir su lector.
 */
function anteriorDelCierre(entrada: EntradaDeAuditoriaDeCarga): AnteriorDelCierre {
  const anterior = entrada.anterior as Partial<AnteriorDelCierre> | null;
  if (anterior?.version !== VERSION_QUE_SE_SABE_LEER) {
    throw new Error(
      `La auditoría del cierre ${entrada.id} tiene la versión ${String(anterior?.version)}: no hay lector para ella.`,
    );
  }
  return anterior as AnteriorDelCierre;
}

export const esCierre = (entrada: EntradaDeAuditoriaDeCarga) => entrada.accion === 'cerrar';

export function aUltimoCierre(entrada: EntradaDeAuditoriaDeCarga): UltimoCierreDto {
  const { revision } = anteriorDelCierre(entrada);
  return {
    diferencias: revision.diferencias,
    avisos: revision.avisos,
    motivo: entrada.motivo,
    revisionGuardada: true,
  };
}

export function aEntradaDelHistorial(entrada: EntradaDeAuditoriaDeCarga): EntradaDelHistorialDeCargaDto {
  const revision = esCierre(entrada) ? anteriorDelCierre(entrada).revision : null;
  return {
    id: entrada.id,
    accion: entrada.accion as AccionDelHistorialDeCarga,
    fecha: entrada.creadoEn,
    porNombre: entrada.porNombre,
    motivo: entrada.motivo,
    diferencias: revision?.diferencias ?? null,
    avisos: revision?.avisos ?? null,
  };
}

export function aCierreGuardado(entrada: EntradaDeAuditoriaDeCarga): CierreDeCargaInicialDto {
  const { carga, revision, balanceDeApertura } = anteriorDelCierre(entrada);
  return {
    id: entrada.id,
    empresaId: carga.empresaId,
    fechaDeInicio: carga.fechaDeInicio,
    cerradaEn: entrada.creadoEn,
    cerradaPor: entrada.porNombre,
    motivo: entrada.motivo,
    diferencias: revision.diferencias,
    avisos: revision.avisos,
    huella: revision.huella,
    modulos: revision.modulos,
    balanceDeApertura,
  };
}
