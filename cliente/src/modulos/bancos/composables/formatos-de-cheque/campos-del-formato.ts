import type {
  CampoAlineable,
  CampoDeCheque,
  FechaDeCheque,
  FormatoDeCheque,
} from '../../servicios/tipos-de-formatos-de-cheque';

/** Un lugar del papel que el editor deja mover: cómo se llama, a qué grupo pertenece y qué se le puede configurar. */
export interface EntradaDeCampo {
  /** La ruta dentro del formato: `beneficiario`, `fecha.dia`, `talonFecha`… */
  clave: string;
  etiqueta: string;
  grupo: 'fecha' | 'cheque' | 'leyendas' | 'talon';
  /** Se puede quitar del formato (queda en `null`). */
  opcional: boolean;
  /** Admite elegir cómo se alinea el texto. */
  conAlineacion: boolean;
  /** Es una leyenda que el formulario puede traer ya impresa. */
  conPreimpreso: boolean;
}

type Datos = Pick<EntradaDeCampo, 'etiqueta' | 'grupo'> & Partial<EntradaDeCampo>;

const entrada = (clave: string, datos: Datos): EntradaDeCampo => ({
  clave,
  opcional: false,
  conAlineacion: false,
  conPreimpreso: false,
  ...datos,
});

const DE_FECHA_EN_TEXTO = [
  entrada('fecha.lugarYFecha', { etiqueta: 'Lugar y fecha', grupo: 'fecha', conAlineacion: true }),
];

const DE_FECHA_EN_CASILLAS = [
  entrada('fecha.lugar', { etiqueta: 'Lugar', grupo: 'fecha', opcional: true }),
  entrada('fecha.dia', { etiqueta: 'Día', grupo: 'fecha' }),
  entrada('fecha.mes', { etiqueta: 'Mes', grupo: 'fecha' }),
  entrada('fecha.anio', { etiqueta: 'Año', grupo: 'fecha' }),
];

const DEL_CHEQUE = [
  entrada('beneficiario', { etiqueta: 'Beneficiario', grupo: 'cheque' }),
  entrada('montoEnNumeros', { etiqueta: 'Monto en números', grupo: 'cheque' }),
  entrada('montoEnLetras', { etiqueta: 'Monto en letras (primer renglón)', grupo: 'cheque' }),
];

const LEYENDAS = [
  entrada('noNegociable', { etiqueta: 'NO NEGOCIABLE', grupo: 'leyendas', conPreimpreso: true }),
  entrada('paraAbonoEnCuenta', { etiqueta: 'PARA ABONO EN CUENTA', grupo: 'leyendas', conPreimpreso: true }),
];

const DEL_TALON = [
  entrada('talonFecha', { etiqueta: 'Fecha del talón', grupo: 'talon', opcional: true, conAlineacion: true }),
  entrada('talonBeneficiario', {
    etiqueta: 'Beneficiario del talón',
    grupo: 'talon',
    opcional: true,
    conAlineacion: true,
  }),
  entrada('talonMonto', { etiqueta: 'Monto del talón', grupo: 'talon', opcional: true, conAlineacion: true }),
  entrada('talonConcepto', { etiqueta: 'Concepto del talón', grupo: 'talon', opcional: true, conAlineacion: true }),
];

/** Los campos que el editor ofrece para este formato (los de la fecha dependen del modo). */
export function entradasDelFormato(formato: FormatoDeCheque): EntradaDeCampo[] {
  const fecha = formato.fecha.modo === 'texto' ? DE_FECHA_EN_TEXTO : DE_FECHA_EN_CASILLAS;
  return [...fecha, ...DEL_CHEQUE, ...LEYENDAS, ...DEL_TALON];
}

type Objeto = Record<string, unknown>;

function contenedorDe(formato: FormatoDeCheque, clave: string): [Objeto, string] {
  const partes = clave.split('.');
  const ultimo = partes.pop() as string;
  const contenedor = partes.reduce<Objeto>((actual, parte) => actual[parte] as Objeto, formato as unknown as Objeto);
  return [contenedor, ultimo];
}

/** El campo del formato en esa ruta; `null` si es opcional y no se usa. */
export function leerCampo(formato: FormatoDeCheque, clave: string): CampoAlineable | null {
  const [contenedor, ultimo] = contenedorDe(formato, clave);
  return (contenedor[ultimo] as CampoAlineable | null | undefined) ?? null;
}

const campoNuevo = (xMm: number, yMm: number, anchoMm: number): CampoDeCheque => ({ xMm, yMm, anchoMm, visible: true });

/** Lo que se pone al empezar a usar un campo opcional: un lugar razonable que el usuario ajusta. */
function campoPorOmision(formato: FormatoDeCheque, clave: string): CampoAlineable {
  const alto = formato.papel.altoMm;
  if (clave === 'fecha.lugar') return campoNuevo(40, (formato.fecha as { dia: CampoDeCheque }).dia.yMm, 40);
  return { ...campoNuevo(15, Math.min(15, alto - 10), 60), alineacion: 'izquierda' };
}

/** Empieza o deja de poner un campo opcional del formato (en `null` no se imprime). */
export function ponerCampo(formato: FormatoDeCheque, clave: string, usar: boolean): void {
  const [contenedor, ultimo] = contenedorDe(formato, clave);
  contenedor[ultimo] = usar ? campoPorOmision(formato, clave) : null;
}

/** Empieza o deja de poner el segundo renglón de las letras (debajo del primero, del mismo ancho). */
export function ponerSegundoRenglon(formato: FormatoDeCheque, usar: boolean): void {
  const { xMm, yMm, anchoMm } = formato.montoEnLetras;
  formato.montoEnLetras.segundaLinea = usar ? { xMm, yMm: yMm + 7, anchoMm } : null;
}

/** Empieza o deja de poner el comprobante dentro de la hoja (sin él sale en hoja carta aparte). */
export function ponerComprobante(formato: FormatoDeCheque, usar: boolean): void {
  const abajo = formato.papel.altoMm * 0.4;
  formato.comprobante = usar ? { yMm: Math.round(abajo), altoMm: Math.round(formato.papel.altoMm - abajo - 10) } : null;
}

/** El formato con la fecha en el otro modo: los lugares se reparten sobre el mismo renglón. */
export function conModoDeFecha(formato: FormatoDeCheque, modo: FechaDeCheque['modo']): FormatoDeCheque {
  if (formato.fecha.modo === modo) return formato;
  if (formato.fecha.modo === 'casillas') {
    const { dia } = formato.fecha;
    const lugarYFecha: CampoAlineable = { ...campoNuevo(95, dia.yMm, 75), alineacion: 'derecha' };
    return { ...formato, fecha: { modo: 'texto', lugarYFecha } };
  }
  const y = formato.fecha.lugarYFecha.yMm;
  const fecha: FechaDeCheque = {
    modo: 'casillas',
    lugar: campoNuevo(40, y, 40),
    dia: campoNuevo(105, y, 8),
    mes: campoNuevo(118, y, 8),
    anio: campoNuevo(131, y, 14),
  };
  return { ...formato, fecha };
}
