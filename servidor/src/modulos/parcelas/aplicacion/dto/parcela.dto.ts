import type { DatosDeParcela, FormaDeTenencia } from '../../dominio/datos-de-parcela.js';
import type { MedicionDto, SolicitudDeMedicion } from './medicion.dto.js';

/** Parcela tal como la ve el usuario en pantalla. Las superficies viajan como texto, en m² con dos decimales. */
export interface ParcelaDto {
  id: string;
  localidadId: string;
  localidadNombre: string;
  parcelaMadreId: string | null;
  parcelaMadreCodigo: string | null;
  nivel: number;
  tipoId: string;
  tipoNombre: string;
  codigo: string;
  nombre: string;
  formaDeTenencia: FormaDeTenencia;
  superficieTotalM2: string | null;
  superficieUtilM2: string | null;
  latitud: string | null;
  longitud: string | null;
  colindanciaNorte: string | null;
  colindanciaSur: string | null;
  colindanciaOriente: string | null;
  colindanciaPoniente: string | null;
  activo: boolean;
  observaciones: string | null;
  /** Avisos que no bloquean: el punto fuera de Guatemala, por ejemplo. */
  avisos: string[];
}

/** Un inmueble registral ligado a una parcela, con los m² de esa finca que abarca (si se conocen). */
export interface InmuebleDeParcelaDto {
  inmuebleId: string;
  inmuebleNombre: string;
  superficieM2: string | null;
}

/** Lo que se escribe al ligar un inmueble a una parcela. */
export interface LigaConInmueble {
  inmuebleId: string;
  superficieM2: string | null;
}

/** La ficha de una parcela: sus datos, sus mediciones vigentes y los inmuebles que abarca. */
export interface FichaDeParcelaDto extends ParcelaDto {
  mediciones: MedicionDto[];
  inmuebles: InmuebleDeParcelaDto[];
  /** Subparcelas activas: la ficha avisa si la suma de su superficie pasa la de esta parcela. */
  hijasActivas: number;
}

/** Lo que se recibe para cambiar una parcela: sus datos editables y los inmuebles que abarca. */
export interface CambioDeParcela {
  tipoId: string;
  nombre: string;
  formaDeTenencia: FormaDeTenencia;
  latitud: string | null;
  longitud: string | null;
  colindanciaNorte: string | null;
  colindanciaSur: string | null;
  colindanciaOriente: string | null;
  colindanciaPoniente: string | null;
  observaciones: string | null;
  inmuebles: LigaConInmueble[];
}

/** Lo que se recibe para crear una parcela: sus datos, dónde va y, si ya se conoce, su primera medición. */
export interface SolicitudDeParcela extends CambioDeParcela, Pick<DatosDeParcela, 'codigo'> {
  localidadId: string;
  parcelaMadreId: string | null;
  medicion: SolicitudDeMedicion | null;
}

/** Quién pide ver las parcelas y cuáles. */
export interface FiltrosDeParcelas {
  localidadId?: string;
  parcelaMadreId?: string;
  tipoId?: string;
  formaDeTenencia?: FormaDeTenencia;
  /** Solo las activas (por omisión se listan todas). */
  soloActivas?: boolean;
  texto?: string;
}

/** Una parcela con sus subparcelas, para mostrar el árbol de una localidad. */
export interface NodoDeParcela extends ParcelaDto {
  hijas: NodoDeParcela[];
}
