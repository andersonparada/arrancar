import type {
  AgenteDeRetencionDeIva,
  RegimenDeIsrDeEmpresa,
  RegimenDeIva,
  TipoDePersona,
} from '../../dominio/datos-fiscales-de-empresa.js';
import type { RegimenDeIsrDeProveedor } from '../../dominio/datos-fiscales-de-proveedor.js';

/** Una vigencia del historial fiscal de la empresa; `vigenteHasta` es el último mes incluido (nulo si es la última). */
export interface VigenciaFiscalDto {
  id: string;
  /** Nulo: «desde el inicio» (la base, que no se quita). */
  vigenteDesde: string | null;
  vigenteHasta: string | null;
  tipoDePersona: TipoDePersona;
  regimenIva: RegimenDeIva;
  regimenIsr: RegimenDeIsrDeEmpresa | null;
  agenteDeRetencionIva: AgenteDeRetencionDeIva;
  esAgenteDeRetencionIsr: boolean;
  /** Hay documentos vigentes registrados en los meses de esta vigencia. */
  conDocumentos: boolean;
}

/**
 * Datos fiscales de una empresa tal como los ve el usuario: los de la vigencia de hoy y el historial. `guardado` es
 * falso si la empresa nunca guardó datos: entonces `tipoDePersona` es nulo (se escoge, no se supone), el resto son
 * los valores con que se muestra el formulario vacío y el historial va vacío.
 */
export interface DatosFiscalesDeEmpresaDto {
  empresaId: string;
  guardado: boolean;
  /** Desde cuándo rige lo de hoy (nulo: desde el inicio). */
  vigenteDesde: string | null;
  tipoDePersona: TipoDePersona | null;
  regimenIva: RegimenDeIva;
  regimenIsr: RegimenDeIsrDeEmpresa | null;
  agenteDeRetencionIva: AgenteDeRetencionDeIva;
  esAgenteDeRetencionIsr: boolean;
  historial: VigenciaFiscalDto[];
}

/** Datos fiscales de un proveedor tal como los ve el usuario; `guardado` es falso si son los valores por omisión. */
export interface DatosFiscalesDeProveedorDto {
  proveedorId: string;
  esPequenoContribuyente: boolean;
  regimenIsr: RegimenDeIsrDeProveedor | null;
  esAgenteDeRetencionIva: boolean;
  seLeRetieneIva: boolean;
  seLeRetieneIsr: boolean;
  seLeRetieneIvaPequenoContribuyente: boolean;
  guardado: boolean;
}
