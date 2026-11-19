import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { Capitalizacion, LineaDeBandeja } from '../../servicios/bandeja.api';
import type { EdicionDeAsignacion } from './edicion-de-capitalizacion';
import { etiquetaDeDocumento, restaDelCosto } from './lineas-de-bandeja';
import { centavosDeTexto, costoPorUnidad, textoDeCentavos } from './montos-de-bandeja';
import { unidadesAcrear } from './validar-capitalizacion';

/** El recordatorio de software y suscripciones (V-2) que acompaña a la bandeja. */
export const AVISO_DE_SOFTWARE = {
  titulo: 'Software, licencias y suscripciones',
  lineas: [
    'El programa que viene con el equipo (el sistema de una computadora o de una máquina) es costo del equipo: capitalícelo con él.',
    'Solo la licencia comprada aparte va a la clase «Programas y licencias».',
    'Las suscripciones y los servicios en la nube son gasto: descártelos.',
  ],
};

/** Cómo se llama la línea en los mensajes: «línea 2 de Factura A-100». */
export const nombreDeLinea = (linea: LineaDeBandeja): string =>
  `línea ${linea.numeroDeLinea} de ${etiquetaDeDocumento(linea.tipoDeDocumento)} ${linea.documento}`;

/** Lo que pasa al descartar una línea (R-3): explica que el libro no se corrige. */
export function textoDeDescarte(linea: LineaDeBandeja): string {
  return (
    `Se descarta la ${nombreDeLinea(linea)} (${formatearMonto(linea.pendiente)} pendientes): se toma como gasto y ` +
    'sale de la bandeja. Su pago ya se clasificó como Inversión y su IVA en la casilla de activos fijos; el libro de ' +
    'compras no se corrige. Si se equivoca, podrá devolverla a la bandeja solo mientras no recargue la página.'
  );
}

/** La suma, con signo, de lo que se capitalizará. */
function totalDeLasPartes(partes: readonly EdicionDeAsignacion[], lineas: readonly LineaDeBandeja[]): string {
  const suma = partes.reduce((total, parte) => {
    const linea = lineas.find((candidata) => candidata.lineaId === parte.lineaId);
    const centavos = Math.abs(centavosDeTexto(parte.monto) ?? 0);
    return total + (linea && restaDelCosto(linea) ? -centavos : centavos);
  }, 0);
  return textoDeCentavos(suma);
}

const plural = (cantidad: number, uno: string, varios: string): string =>
  `${cantidad} ${cantidad === 1 ? uno : varios}`;

/** Lo que sale por pieza cuando cada activo lleva varias; vacío si lleva una sola. */
function textoPorPieza(cadaUna: number, piezas: number): string {
  if (!Number.isInteger(piezas) || piezas < 2) return '';
  return ` Por pieza salen unos ${formatearMonto(textoDeCentavos(Math.floor(cadaUna / piezas)))}.`;
}

/**
 * La ayuda de costo por unidad (I-12): lo que recibe cada activo, el sobrante del redondeo en el último y, si cada
 * activo lleva varias piezas, lo que sale por pieza. Es solo para mostrar: el servidor hace el reparto.
 */
export function textoDeCostoPorUnidad(monto: string | number, unidades: number, piezas: number): string | null {
  const centavos = centavosDeTexto(monto);
  const reparto = centavos === null ? null : costoPorUnidad(centavos, unidades);
  if (!reparto) return null;
  const dePieza = textoPorPieza(reparto.cadaUna, piezas);
  if (unidades === 1) return dePieza.trim() || null;
  const ultimo = reparto.conSobrante
    ? `; el último recibe ${formatearMonto(textoDeCentavos(reparto.ultima))} (el sobrante del redondeo)`
    : '';
  return `Cada activo recibe ${formatearMonto(textoDeCentavos(reparto.cadaUna))}${ultimo}.${dePieza}`;
}

const CODIGOS_QUE_SE_NOMBRAN = 5;

/** El aviso de éxito al capitalizar: nombra los activos creados (hasta cinco) y dice cuántos costos se registraron. */
export function mensajeDeCapitalizado(resultado: Pick<Capitalizacion, 'activos' | 'costos'>): string {
  const costos = plural(resultado.costos, 'costo registrado', 'costos registrados');
  const codigos = resultado.activos.map(({ codigo }) => codigo);
  if (codigos.length === 0) return `Capitalizado: ${costos}.`;
  const nombrados = codigos.slice(0, CODIGOS_QUE_SE_NOMBRAN).join(', ');
  const resto = codigos.length - CODIGOS_QUE_SE_NOMBRAN;
  return `Capitalizado: ${costos}. Activos: ${nombrados}${resto > 0 ? ` y ${resto} más` : ''}.`;
}

/** El resumen que se ve antes de confirmar: qué se crea, a qué se suma y cuánto es en total. */
export function resumenDeCapitalizacion(
  partes: readonly EdicionDeAsignacion[],
  lineas: readonly LineaDeBandeja[],
): string {
  const nuevos = unidadesAcrear(partes);
  const sumas = partes.filter((parte) => parte.destino !== 'nuevo').length;
  const efectos = [
    nuevos > 0 ? `se crea${nuevos === 1 ? '' : 'n'} ${plural(nuevos, 'activo nuevo', 'activos nuevos')}` : '',
    sumas > 0 ? `se suma${sumas === 1 ? '' : 'n'} ${plural(sumas, 'costo', 'costos')} a activos que ya existen` : '',
  ].filter(Boolean);
  return `Al confirmar ${efectos.join(' y ')}, por ${formatearMonto(totalDeLasPartes(partes, lineas))} en total.`;
}
