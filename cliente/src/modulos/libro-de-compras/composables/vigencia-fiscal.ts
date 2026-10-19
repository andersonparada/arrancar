import type { VigenciaFiscal } from '../servicios/libro-de-compras.api';
import { REGIMENES_DE_IVA, TEXTOS_DE_HISTORIAL } from '../textos';
import { etiquetaDePeriodo } from './documentos/filtros-de-documentos';

/** Cómo contesta el usuario «¿Desde cuándo rigen estos datos?». */
export type ModoDeVigencia = 'actual' | 'mes' | 'inicio';

const MESES_ATRAS = 36;
const MESES_ADELANTE = 12;

/** `undefined` es «la vigencia de hoy», `null` «desde el inicio» y un texto es «desde ese mes». */
export const modoDeVigencia = (vigenteDesde: string | null | undefined): ModoDeVigencia =>
  vigenteDesde === undefined ? 'actual' : vigenteDesde === null ? 'inicio' : 'mes';

const primerDia = (fecha: Date): string => `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-01`;

const conMayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/**
 * El mes que se propone para «cambió a partir de»: el actual, o el siguiente si lo que rige hoy ya tiene facturas
 * (así el cambio no choca con ellas).
 */
export function mesPropuesto(hoy: Date, hayFacturasEnLoQueRigeHoy: boolean): string {
  return primerDia(new Date(hoy.getFullYear(), hoy.getMonth() + (hayFacturasEnLoQueRigeHoy ? 1 : 0), 1));
}

/** Los meses que se pueden escoger, del más reciente al más antiguo; si ya hay uno fuera de rango, también. */
export function opcionesDeMes(hoy: Date, actual?: string | null): { valor: string; texto: string }[] {
  const meses = Array.from({ length: MESES_ATRAS + MESES_ADELANTE + 1 }, (_, i) =>
    primerDia(new Date(hoy.getFullYear(), hoy.getMonth() + MESES_ADELANTE - i, 1)),
  );
  const todos = actual && !meses.includes(actual) ? [...meses, actual] : meses;
  return todos.map((valor) => ({ valor, texto: conMayuscula(etiquetaDePeriodo(valor)) }));
}

/** «Octubre de 2026», o «Desde el inicio» si no hay fecha. */
export const etiquetaDeDesde = (vigenteDesde: string | null): string =>
  vigenteDesde === null ? TEXTOS_DE_HISTORIAL.desdeElInicio : conMayuscula(etiquetaDePeriodo(vigenteDesde));

/** La base (desde el inicio) no se quita, y una vigencia con facturas tampoco: lo demás lo decide el servidor. */
export const puedeQuitarseLaVigencia = (vigencia: VigenciaFiscal): boolean =>
  vigencia.vigenteDesde !== null && !vigencia.conDocumentos;

/** Por qué no se puede quitar, o `null` si se puede. */
export function motivoParaNoQuitar(vigencia: VigenciaFiscal): string | null {
  if (vigencia.vigenteDesde === null) return TEXTOS_DE_HISTORIAL.base;
  return vigencia.conDocumentos ? TEXTOS_DE_HISTORIAL.conDocumentos : null;
}

/** El último mes incluido, o «vigente» si es la última. */
export const etiquetaDeHasta = (vigencia: VigenciaFiscal): string =>
  vigencia.vigenteHasta === null ? TEXTOS_DE_HISTORIAL.vigente : conMayuscula(etiquetaDePeriodo(vigencia.vigenteHasta));

/** Lo que pasará al quitar una vigencia: su rango y quién rige esos meses después. */
export function resumenDeQuitarVigencia(historial: readonly VigenciaFiscal[], vigencia: VigenciaFiscal): string {
  const anterior = historial[historial.findIndex((v) => v.id === vigencia.id) - 1];
  const desde = etiquetaDeDesde(vigencia.vigenteDesde).toLowerCase();
  const hasta = etiquetaDeHasta(vigencia).toLowerCase();
  const rango = vigencia.vigenteHasta === null ? `${desde} en adelante` : `${desde} a ${hasta}`;
  const quien = anterior ? `la vigencia anterior (${REGIMENES_DE_IVA[anterior.regimenIva]})` : 'la vigencia anterior';
  return `Se quitará la vigencia de ${rango} (${REGIMENES_DE_IVA[vigencia.regimenIva]}). Esos meses pasarán a regirse por ${quien}. No cambia ninguna factura.`;
}
