import { montoEnLetras } from '../../core/compartido/dominio/monto-en-letras.js';
import { fechaCorta, fechaEnCasillas, lugarYFechaEnTexto } from './formatos-de-cheque/fecha-del-cheque.js';
import {
  leyendaNoNegociable,
  leyendaParaAbonoEnCuenta,
  TEXTO_NO_NEGOCIABLE,
  TEXTO_PARA_ABONO_EN_CUENTA,
} from './formatos-de-cheque/leyendas-del-cheque.js';
import {
  beneficiarioArmado,
  capacidadDeRenglon,
  cifraDelMonto,
  letrasArmadas,
  montoEnNumerosRellenado,
} from './formatos-de-cheque/texto-del-cheque.js';
import type { Alineacion, CampoAlineable, CampoDeCheque, FormatoDeCheque } from './formatos-de-cheque/tipos.js';

/** Lo que se imprime en un cheque, tal como está en su movimiento. */
export interface DatosParaImprimir {
  /** La del cheque (un posfechado lleva la suya): `AAAA-MM-DD`. */
  fecha: string;
  /** El lugar que encabeza la fecha (`bancos.cheques.lugar_de_emision`). */
  lugar: string;
  beneficiario: string;
  montoCentavos: number;
  /** Solo para el talón. */
  concepto: string | null;
  noNegociable: boolean;
  paraAbonoEnCuenta: boolean;
}

/** Un texto ya armado, con su lugar en el papel: el cliente solo lo dibuja. */
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
  /** Avisos que no bloquean (formulario con leyendas ya impresas). */
  avisos: string[];
}

type Dibujo = Pick<CampoArmado, 'clave' | 'texto'> & Partial<Pick<CampoArmado, 'tamanoPt' | 'alineacion'>>;

/** Un campo del formato con su texto; si no es visible, no se dibuja. */
function armado(campo: CampoDeCheque | CampoAlineable | null, dibujo: Dibujo, letra: number): CampoArmado[] {
  if (!campo || !campo.visible) return [];
  const alineacion = dibujo.alineacion ?? ('alineacion' in campo ? campo.alineacion : undefined) ?? 'izquierda';
  const { xMm, yMm, anchoMm } = campo;
  return [{ ...dibujo, xMm, yMm, anchoMm, alineacion, tamanoPt: dibujo.tamanoPt ?? campo.tamanoPt ?? letra }];
}

function camposDeLaFecha({ fecha: formato, letra }: FormatoDeCheque, datos: DatosParaImprimir): CampoArmado[] {
  const tamano = letra.tamanoPt;
  if (formato.modo === 'texto') {
    const texto = lugarYFechaEnTexto(datos.lugar, datos.fecha);
    return armado(formato.lugarYFecha, { clave: 'fecha', texto }, tamano);
  }
  const partes = fechaEnCasillas(datos.fecha);
  return [
    ...armado(formato.lugar, { clave: 'lugar', texto: datos.lugar }, tamano),
    ...armado(formato.dia, { clave: 'dia', texto: partes.dia, alineacion: 'centro' }, tamano),
    ...armado(formato.mes, { clave: 'mes', texto: partes.mes, alineacion: 'centro' }, tamano),
    ...armado(formato.anio, { clave: 'anio', texto: partes.anio, alineacion: 'centro' }, tamano),
  ];
}

function camposDelBeneficiario({ beneficiario, letra }: FormatoDeCheque, datos: DatosParaImprimir): CampoArmado[] {
  const tamanoInicial = beneficiario.tamanoPt ?? letra.tamanoPt;
  const { texto, tamanoPt } = beneficiarioArmado(datos.beneficiario, {
    anchoMm: beneficiario.anchoMm,
    tamanoPt: tamanoInicial,
  });
  return armado(beneficiario, { clave: 'beneficiario', texto, tamanoPt }, letra.tamanoPt);
}

function camposDelMonto({ montoEnNumeros, letra }: FormatoDeCheque, datos: DatosParaImprimir): CampoArmado[] {
  const tamano = montoEnNumeros.tamanoPt ?? letra.tamanoPt;
  const capacidad = capacidadDeRenglon(montoEnNumeros.anchoMm, tamano);
  const texto = montoEnNumerosRellenado(datos.montoCentavos, capacidad);
  return armado(montoEnNumeros, { clave: 'montoEnNumeros', texto, alineacion: 'derecha' }, letra.tamanoPt);
}

function camposDeLasLetras({ montoEnLetras: campo, letra }: FormatoDeCheque, datos: DatosParaImprimir): CampoArmado[] {
  const tamano = campo.tamanoPt ?? letra.tamanoPt;
  const texto = montoEnLetras(datos.montoCentavos).toLocaleUpperCase('es-GT');
  const segunda = campo.segundaLinea;
  const { primero, segundo } = letrasArmadas(texto, {
    primero: capacidadDeRenglon(campo.anchoMm, tamano),
    segundo: segunda ? capacidadDeRenglon(segunda.anchoMm, tamano) : null,
  });
  const renglones = armado(campo, { clave: 'montoEnLetras', texto: primero }, letra.tamanoPt);
  if (segundo === null || !segunda || !campo.visible) return renglones;
  const alturaDelSegundo = armado(
    { ...campo, ...segunda },
    { clave: 'montoEnLetras2', texto: segundo },
    letra.tamanoPt,
  );
  return [...renglones, ...alturaDelSegundo];
}

/** Las dos leyendas y los avisos que dejan; solo se dibujan las que corresponden. */
function leyendasDelCheque(formato: FormatoDeCheque, datos: DatosParaImprimir) {
  const { noNegociable, paraAbonoEnCuenta, letra } = formato;
  const negociable = leyendaNoNegociable(noNegociable, datos.noNegociable);
  const abono = leyendaParaAbonoEnCuenta(paraAbonoEnCuenta, datos.paraAbonoEnCuenta);
  const campos = [
    ...(negociable.dibujar
      ? armado(noNegociable, { clave: 'noNegociable', texto: TEXTO_NO_NEGOCIABLE }, letra.tamanoPt)
      : []),
    ...(abono.dibujar
      ? armado(paraAbonoEnCuenta, { clave: 'paraAbonoEnCuenta', texto: TEXTO_PARA_ABONO_EN_CUENTA }, letra.tamanoPt)
      : []),
  ];
  return { campos, avisos: [negociable.aviso, abono.aviso].filter((aviso): aviso is string => aviso !== null) };
}

/** El talón: lo que la empresa conserva; puede decir más que el cheque (el concepto). */
function camposDelTalon(formato: FormatoDeCheque, datos: DatosParaImprimir): CampoArmado[] {
  const tamano = formato.letra.tamanoPt;
  const monto = `Q ${cifraDelMonto(datos.montoCentavos)}`;
  return [
    ...armado(formato.talonFecha, { clave: 'talonFecha', texto: fechaCorta(datos.fecha) }, tamano),
    ...armado(formato.talonBeneficiario, { clave: 'talonBeneficiario', texto: datos.beneficiario.trim() }, tamano),
    ...armado(formato.talonMonto, { clave: 'talonMonto', texto: monto, alineacion: 'derecha' }, tamano),
    ...armado(formato.talonConcepto, { clave: 'talonConcepto', texto: datos.concepto?.trim() ?? '' }, tamano),
  ];
}

/**
 * Arma todo lo que se imprime en la cara del cheque (y en su talón): la fecha, el beneficiario y los montos con su
 * relleno de asteriscos, y las leyendas que correspondan. Nada más: la lista de campos del formato es cerrada.
 * @throws BeneficiarioNoCabe, MontoEnLetrasNoCabe o MontoEnNumerosNoCabe si algo no cabe en su renglón.
 * @throws CampoDelFormatoFaltante si el cheque es «para abono en cuenta» y el formato no tiene dónde ponerlo.
 */
export function armarCheque(formato: FormatoDeCheque, datos: DatosParaImprimir): ChequeArmado {
  const leyendas = leyendasDelCheque(formato, datos);
  const campos = [
    ...camposDeLaFecha(formato, datos),
    ...camposDelBeneficiario(formato, datos),
    ...camposDelMonto(formato, datos),
    ...camposDeLasLetras(formato, datos),
    ...leyendas.campos,
    ...camposDelTalon(formato, datos),
  ];
  const { papel, desplazamiento, letra } = formato;
  return { papel, desplazamiento, letra, campos, avisos: leyendas.avisos };
}
