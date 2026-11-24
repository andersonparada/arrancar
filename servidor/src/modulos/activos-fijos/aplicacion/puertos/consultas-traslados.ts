import type { BoletaDto, BoletaFirmadaDto } from '../dto/traslado.dto.js';

/** Lecturas de las boletas de traslado. */
export interface ConsultasTraslados {
  /** @throws RecursoNoEncontrado si el grupo no existe o no es de la empresa. */
  boleta(grupoId: string): Promise<BoletaDto>;
  /** Los datos del escaneo firmado (nunca su ruta ni su id), o `null` si todavía no se sube. */
  firmadaDe(grupoId: string): Promise<BoletaFirmadaDto | null>;
}
