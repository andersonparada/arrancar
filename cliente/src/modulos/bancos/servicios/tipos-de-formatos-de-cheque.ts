/**
 * La forma de un formato de impresión de cheques tal como la manda el servidor (en milímetros y puntos). La lista de
 * campos es cerrada: no hay un campo de texto libre en la cara del cheque.
 */

export const CLAVES_DE_PLANTILLA = [
  'voucher_carta_arriba',
  'voucher_carta_en_medio',
  'cheque_suelto',
  'cheque_suelto_casillas',
] as const;

export type ClaveDePlantilla = (typeof CLAVES_DE_PLANTILLA)[number];

export type Alineacion = 'izquierda' | 'centro' | 'derecha';

export interface CampoDeCheque {
  xMm: number;
  yMm: number;
  anchoMm: number;
  tamanoPt?: number;
  visible: boolean;
}

export interface CampoAlineable extends CampoDeCheque {
  alineacion?: Alineacion;
}

export interface CampoDeLeyenda extends CampoDeCheque {
  /** El formulario ya trae la leyenda impresa. */
  preimpreso: boolean;
}

export interface SegundaLineaDeLetras {
  xMm: number;
  yMm: number;
  anchoMm: number;
}

export type FechaDeCheque =
  | { modo: 'texto'; lugarYFecha: CampoAlineable }
  | { modo: 'casillas'; lugar: CampoDeCheque | null; dia: CampoDeCheque; mes: CampoDeCheque; anio: CampoDeCheque };

export interface FormatoDeCheque {
  papel: { anchoMm: number; altoMm: number };
  desplazamiento: { xMm: number; yMm: number };
  letra: { familia: 'monoespaciada'; tamanoPt: number };
  fecha: FechaDeCheque;
  beneficiario: CampoDeCheque;
  montoEnNumeros: CampoDeCheque;
  montoEnLetras: CampoDeCheque & { segundaLinea: SegundaLineaDeLetras | null };
  noNegociable: CampoDeLeyenda;
  paraAbonoEnCuenta: CampoDeLeyenda;
  talonFecha: CampoAlineable | null;
  talonBeneficiario: CampoAlineable | null;
  talonMonto: CampoAlineable | null;
  talonConcepto: CampoAlineable | null;
  /** Dónde va el comprobante dentro de la hoja; `null` = en hoja carta aparte. */
  comprobante: { yMm: number; altoMm: number } | null;
}

export interface PlantillaDeCheque {
  clave: ClaveDePlantilla;
  nombre: string;
  descripcion: string;
  formato: FormatoDeCheque;
}

/** Un formato guardado de la cuenta. `ajustes` es solo lo que difiere de su plantilla de fábrica. */
export interface FormatoDeChequeGuardado {
  id: string;
  nombre: string;
  base: ClaveDePlantilla;
  ajustes: Record<string, unknown>;
  probadoEn: string | null;
  activo: boolean;
  chequerasQueLoUsan: number;
}

export interface FormatoDeChequeDetalle extends FormatoDeChequeGuardado {
  /** Las medidas ya resueltas; `null` si el formato está dañado. */
  resuelto: FormatoDeCheque | null;
  danado: boolean;
}

export interface DatosDeFormatoDeCheque {
  nombre: string;
  base: ClaveDePlantilla;
  ajustes: Record<string, unknown>;
}

/** Un texto ya armado por el servidor (con su relleno) y su lugar en el papel: el cliente solo lo dibuja. */
export interface CampoArmado {
  clave: string;
  xMm: number;
  yMm: number;
  anchoMm: number;
  tamanoPt: number;
  alineacion: Alineacion;
  texto: string;
}

export interface ChequeArmado {
  papel: FormatoDeCheque['papel'];
  desplazamiento: FormatoDeCheque['desplazamiento'];
  letra: FormatoDeCheque['letra'];
  campos: CampoArmado[];
  avisos: string[];
}

/** La hoja de prueba de alineación. */
export interface PruebaDeAlineacion {
  nombre: string;
  probado: boolean;
  cheque: ChequeArmado;
  reglaMm: number;
}
