/**
 * La forma de un formato de impresión de cheques (`docs/modulos/diseno-impresion-de-cheques.md` §3.2). La lista de
 * campos es **cerrada**: no existe un campo de texto libre en la cara del cheque, así no hay forma de imprimir una
 * anotación (nada de «posfechado»: C. Com. art. 501). Todas las medidas van en milímetros.
 */

export type Alineacion = 'izquierda' | 'centro' | 'derecha';

/** Un renglón o casilla: su esquina superior izquierda, su ancho y si se dibuja. */
export interface CampoDeCheque {
  xMm: number;
  yMm: number;
  anchoMm: number;
  /** Si falta, la letra del formato. */
  tamanoPt?: number;
  visible: boolean;
}

/** Solo la fecha y el talón se alinean; el beneficiario y las letras van a la izquierda y el monto a la derecha, fijos. */
export interface CampoAlineable extends CampoDeCheque {
  alineacion?: Alineacion;
}

/** El renglón de continuación del monto en letras. */
export interface SegundaLineaDeLetras {
  xMm: number;
  yMm: number;
  anchoMm: number;
}

/** Una leyenda que el formulario puede traer ya impresa (`preimpreso`), de modo que no se vuelve a dibujar. */
export interface CampoDeLeyenda extends CampoDeCheque {
  preimpreso: boolean;
}

export type FechaDeCheque =
  | { modo: 'texto'; lugarYFecha: CampoAlineable }
  | { modo: 'casillas'; lugar: CampoDeCheque | null; dia: CampoDeCheque; mes: CampoDeCheque; anio: CampoDeCheque };

export interface FormatoDeCheque {
  papel: { anchoMm: number; altoMm: number };
  /** Calibra la impresora: mueve todo lo del cheque. */
  desplazamiento: { xMm: number; yMm: number };
  /** Solo monoespaciada: el relleno y el corte entre palabras se calculan por número de caracteres. */
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
  /** Dónde va el comprobante de egreso dentro de la hoja; nulo = en hoja carta aparte. */
  comprobante: { yMm: number; altoMm: number } | null;
}
