import {
  primerPeriodoEnRangos,
  type HistorialFiscalDeEmpresa,
  type VigenciaFiscal,
} from '../../../dominio/historial-fiscal-de-empresa.js';
import type { DatosFiscalesDeProveedor } from '../../../dominio/datos-fiscales-de-proveedor.js';
import type {
  DatosFiscalesDeEmpresaDto,
  DatosFiscalesDeProveedorDto,
  VigenciaFiscalDto,
} from '../../dto/datos-fiscales.dto.js';

/** Con lo que se muestra el formulario de una empresa que nunca guardó sus datos fiscales (sin tipo de persona). */
const FORMULARIO_VACIO = {
  vigenteDesde: null,
  tipoDePersona: null,
  regimenIva: 'general',
  regimenIsr: 'utilidades',
  agenteDeRetencionIva: 'ninguno',
  esAgenteDeRetencionIsr: true,
} as const;

function vigenciaDto(
  historial: HistorialFiscalDeEmpresa,
  vigencia: VigenciaFiscal,
  periodos: readonly string[],
): VigenciaFiscalDto {
  const vigenteHasta = historial.vigenteHasta(vigencia);
  const conDocumentos = primerPeriodoEnRangos(periodos, [{ desde: vigencia.vigenteDesde, hasta: vigenteHasta }]);
  return {
    id: vigencia.id!,
    vigenteDesde: vigencia.vigenteDesde,
    vigenteHasta,
    ...vigencia.datos.instantanea(),
    conDocumentos: conDocumentos !== undefined,
  };
}

/**
 * Los datos de la empresa como los ve la pantalla: lo de la vigencia de `hoy` y todo el historial, del más antiguo al
 * más nuevo. `periodosConDocumentos` son los períodos con documentos vigentes.
 */
export function dtoDeEmpresa(
  empresaId: string,
  historial: HistorialFiscalDeEmpresa,
  contexto: { hoy: string; periodosConDocumentos: readonly string[] },
): DatosFiscalesDeEmpresaDto {
  const historialDto = historial.vigencias().map((v) => vigenciaDto(historial, v, contexto.periodosConDocumentos));
  const deHoy = historial.vigenteEn(contexto.hoy);
  if (!deHoy) return { empresaId, guardado: false, ...FORMULARIO_VACIO, historial: historialDto };
  return {
    empresaId,
    guardado: true,
    vigenteDesde: deHoy.vigenteDesde,
    ...deHoy.datos.instantanea(),
    historial: historialDto,
  };
}

/** El historial como queda en la auditoría: sin lo que depende de los documentos. */
export function historialParaAuditoria(empresaId: string, historial: HistorialFiscalDeEmpresa) {
  return {
    empresaId,
    historial: historial.vigencias().map((v) => ({
      id: v.id,
      vigenteDesde: v.vigenteDesde,
      vigenteHasta: historial.vigenteHasta(v),
      ...v.datos.instantanea(),
    })),
  };
}

/** Los datos del proveedor como los ve la pantalla; `guardado` dice si vienen de una fila o son los de omisión. */
export function dtoDeProveedor(
  proveedorId: string,
  datos: DatosFiscalesDeProveedor,
  guardado: boolean,
): DatosFiscalesDeProveedorDto {
  return { proveedorId, ...datos.instantanea(), guardado };
}
