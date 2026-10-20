import type { VigenciaDeCombustible } from '../../servicios/vigencias-de-combustible.api';
import type { EdicionDeVigenciaDeCombustible } from './edicion-de-vigencia-de-combustible';

/** El código que responde el servidor cuando documentos ya usaron la vigencia y el cambio la contradice. */
export const CODIGO_VIGENCIA_EN_USO = 'vigencia_de_combustible_en_uso';

/** Lo que el servidor manda al fallar: el código y el mensaje que explica el conflicto. */
export interface ConflictoDeVigencia {
  codigo: string;
  message: string;
}

type CampoFijo = 'idpPorGalon' | 'porcentajeDeEtanol' | 'ivaExento' | 'vigenteDesde';

type CambioEnCampo = (original: VigenciaDeCombustible, edicion: EdicionDeVigenciaDeCombustible) => boolean;

/** Los datos que una vigencia usada no admite cambiar: tasa, etanol, exención de IVA e inicio. */
const CAMPOS_FIJOS: Record<CampoFijo, CambioEnCampo> = {
  idpPorGalon: (original, edicion) => Number(edicion.idpPorGalon) !== Number(original.idpPorGalon),
  porcentajeDeEtanol: (original, edicion) => Number(edicion.porcentajeDeEtanol) !== Number(original.porcentajeDeEtanol),
  ivaExento: (original, edicion) => edicion.ivaExento !== original.ivaExento,
  vigenteDesde: (original, edicion) => edicion.vigenteDesde !== original.vigenteDesde,
};

/**
 * Los campos que el conflicto de uso señala: los que el usuario cambió y una vigencia usada no admite (tasa,
 * etanol, exención o inicio). Si solo cambió la fecha de cierre, el conflicto es de «Vigente hasta».
 */
export function camposDelConflictoDeUso(
  original: VigenciaDeCombustible,
  edicion: EdicionDeVigenciaDeCombustible,
): string[] {
  const cambiados = (Object.keys(CAMPOS_FIJOS) as CampoFijo[]).filter((campo) =>
    CAMPOS_FIJOS[campo](original, edicion),
  );
  return cambiados.length > 0 ? cambiados : ['vigenteHasta'];
}

/**
 * Los errores por campo de un cambio rechazado porque la vigencia ya la usan documentos. Si el error no es de uso
 * (o la tasa es nueva), no hay errores de campo y el aviso general lo cuenta.
 */
export function erroresDeUsoDeVigencia(
  original: VigenciaDeCombustible | null,
  edicion: EdicionDeVigenciaDeCombustible,
  conflicto: ConflictoDeVigencia,
): Record<string, string> {
  if (!original || conflicto.codigo !== CODIGO_VIGENCIA_EN_USO) return {};
  return Object.fromEntries(camposDelConflictoDeUso(original, edicion).map((campo) => [campo, conflicto.message]));
}
