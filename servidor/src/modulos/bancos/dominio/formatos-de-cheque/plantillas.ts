import type { Alineacion, CampoAlineable, CampoDeCheque, FechaDeCheque, FormatoDeCheque } from './tipos.js';

/** Las formas de papel de fábrica: nombres genéricos, nunca por banco ni con logotipos. */
export const CLAVES_DE_PLANTILLA = [
  'voucher_carta_arriba',
  'voucher_carta_en_medio',
  'cheque_suelto',
  'cheque_suelto_casillas',
] as const;

export type ClaveDePlantilla = (typeof CLAVES_DE_PLANTILLA)[number];

export interface PlantillaDeCheque {
  clave: ClaveDePlantilla;
  nombre: string;
  descripcion: string;
  formato: FormatoDeCheque;
}

const AVISO_DE_MEDIDAS = 'Medidas aproximadas: haga la prueba de alineación antes de imprimir un cheque real.';
/** El cheque guatemalteco común, aproximado. */
const CHEQUE = { anchoMm: 175, altoMm: 76 };
const CARTA = { anchoMm: 215.9, altoMm: 279.4 };
const LETRA = { familia: 'monoespaciada', tamanoPt: 10 } as const;

const campo = (xMm: number, yMm: number, anchoMm: number): CampoDeCheque => ({ xMm, yMm, anchoMm, visible: true });
const alineable = (base: CampoDeCheque, alineacion: Alineacion): CampoAlineable => ({ ...base, alineacion });

const FECHA_EN_TEXTO: FechaDeCheque = { modo: 'texto', lugarYFecha: alineable(campo(95, 12, 75), 'derecha') };
const FECHA_EN_CASILLAS: FechaDeCheque = {
  modo: 'casillas',
  lugar: campo(40, 12, 40),
  dia: campo(105, 12, 8),
  mes: campo(118, 12, 8),
  anio: campo(131, 12, 14),
};

/** El cuerpo del cheque (175 × 76 mm) con su esquina superior izquierda en `arribaMm`; lo comparten las cuatro formas. */
function cuerpoDelCheque(fecha: FechaDeCheque, arribaMm = 0) {
  const y = (renglon: number) => arribaMm + renglon;
  return {
    letra: LETRA,
    desplazamiento: { xMm: 0, yMm: 0 },
    fecha: moverFecha(fecha, arribaMm),
    beneficiario: campo(25, y(24), 105),
    montoEnNumeros: campo(135, y(24), 35),
    montoEnLetras: { ...campo(25, y(33), 145), segundaLinea: { xMm: 25, yMm: y(40), anchoMm: 145 } },
    noNegociable: { ...campo(25, y(52), 45), preimpreso: false },
    paraAbonoEnCuenta: { ...campo(90, y(52), 60), preimpreso: false },
  };
}

function moverFecha(fecha: FechaDeCheque, arribaMm: number): FechaDeCheque {
  const mover = <T extends CampoDeCheque>(c: T): T => ({ ...c, yMm: c.yMm + arribaMm });
  if (fecha.modo === 'texto') return { modo: 'texto', lugarYFecha: mover(fecha.lugarYFecha) };
  const { lugar, dia, mes, anio } = fecha;
  return { modo: 'casillas', lugar: lugar && mover(lugar), dia: mover(dia), mes: mover(mes), anio: mover(anio) };
}

const SIN_TALON = { talonFecha: null, talonBeneficiario: null, talonMonto: null, talonConcepto: null };

const CON_TALON = {
  talonFecha: alineable(campo(15, 15, 60), 'izquierda'),
  talonBeneficiario: alineable(campo(15, 25, 90), 'izquierda'),
  talonMonto: alineable(campo(15, 35, 40), 'derecha'),
  talonConcepto: alineable(campo(15, 45, 100), 'izquierda'),
};

const PLANTILLAS: PlantillaDeCheque[] = [
  {
    clave: 'voucher_carta_arriba',
    nombre: 'Voucher en carta, cheque arriba',
    descripcion: `Hoja carta: el cheque en el tercio de arriba y el comprobante abajo. ${AVISO_DE_MEDIDAS}`,
    formato: {
      ...cuerpoDelCheque(FECHA_EN_TEXTO),
      papel: CARTA,
      ...SIN_TALON,
      comprobante: { yMm: 100, altoMm: 170 },
    },
  },
  {
    clave: 'voucher_carta_en_medio',
    nombre: 'Voucher en carta, talón, cheque en medio y comprobante',
    descripcion: `Hoja carta de tres cuerpos: talón arriba, cheque en medio y comprobante abajo. ${AVISO_DE_MEDIDAS}`,
    formato: {
      ...cuerpoDelCheque(FECHA_EN_TEXTO, 95),
      papel: CARTA,
      ...CON_TALON,
      comprobante: { yMm: 190, altoMm: 85 },
    },
  },
  {
    clave: 'cheque_suelto',
    nombre: 'Cheque suelto',
    descripcion: `Solo el cheque, alimentación manual; el comprobante sale en hoja carta aparte. ${AVISO_DE_MEDIDAS}`,
    formato: { ...cuerpoDelCheque(FECHA_EN_TEXTO), papel: CHEQUE, ...SIN_TALON, comprobante: null },
  },
  {
    clave: 'cheque_suelto_casillas',
    nombre: 'Cheque suelto con la fecha en casillas',
    descripcion: `Como el cheque suelto, para formularios con casillas de día, mes y año. ${AVISO_DE_MEDIDAS}`,
    formato: { ...cuerpoDelCheque(FECHA_EN_CASILLAS), papel: CHEQUE, ...SIN_TALON, comprobante: null },
  },
];

/** Todas las plantillas de fábrica, con sus medidas aproximadas. */
export const plantillasDeFabrica = (): readonly PlantillaDeCheque[] => PLANTILLAS;

export const esClaveDePlantilla = (clave: string): clave is ClaveDePlantilla =>
  (CLAVES_DE_PLANTILLA as readonly string[]).includes(clave);

/** @throws Error si la clave no es de fábrica (una clave así no sale de la base: la restringe un check). */
export function plantillaDeFabrica(clave: ClaveDePlantilla): PlantillaDeCheque {
  const plantilla = PLANTILLAS.find((candidata) => candidata.clave === clave);
  if (!plantilla) throw new Error(`No hay una plantilla de fábrica «${clave}».`);
  return plantilla;
}
