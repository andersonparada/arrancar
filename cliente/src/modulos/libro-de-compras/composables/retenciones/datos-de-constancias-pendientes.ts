import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type {
  ConstanciaPendiente,
  ConstanciasPendientes,
  FiltrosDeConstanciasPendientes,
  TotalPendiente,
} from '../../servicios/constancias-pendientes.api';
import { NOMBRES_CORTOS_DE_GRUPOS } from '../../textos-de-retenciones';
import { nombreDelMes } from './datos-de-pagos';
import { sumarMontos } from './dinero';

type Tono = 'campo' | 'trigo' | 'tierra' | 'rojo';

/** Una cifra del resumen de arriba. */
export interface CifraDelResumen {
  etiqueta: string;
  valor: string;
  destacado?: boolean;
}

/** Al abrir: hasta el mes en curso y sin más filtros. */
export const filtrosDePendientesIniciales = (mesEnCurso: string): FiltrosDeConstanciasPendientes => ({
  hasta: mesEnCurso,
  grupo: '',
  proveedorId: '',
});

/** Lo que se le manda al servidor (y al Excel): lo vacío no viaja. */
export const consultaDePendientes = (filtros: FiltrosDeConstanciasPendientes) => ({
  hasta: filtros.hasta,
  grupo: filtros.grupo || undefined,
  proveedorId: filtros.proveedorId || undefined,
});

/** Cuántos filtros se salen de lo normal (para ofrecer «Quitar filtros»). */
export const cantidadDeFiltrosDePendientes = (filtros: FiltrosDeConstanciasPendientes, mesEnCurso: string): number =>
  [filtros.hasta !== mesEnCurso, !!filtros.grupo, !!filtros.proveedorId].filter(Boolean).length;

const plural = (n: number, uno: string, varios: string): string => `${n} ${n === 1 ? uno : varios}`;

/** «Vence hoy», «Faltan 3 días» o «Vencido hace 2 días» (los días son de calendario). */
export function textoDeDias(dias: number, vencido: boolean, palabra: 'Vencido' | 'Vencida' = 'Vencido'): string {
  if (vencido) return `${palabra} hace ${plural(Math.abs(dias), 'día', 'días')}`;
  if (dias === 0) return 'Vence hoy';
  return `Falta${dias === 1 ? '' : 'n'} ${plural(dias, 'día', 'días')}`;
}

/** El plazo de la constancia en palabras; el IVA no tiene plazo propio y se dice. */
export function textoDelPlazoDeLaConstancia(fila: ConstanciaPendiente): { fecha: string; estado: string } {
  if (!fila.plazoDeLaConstancia || fila.diasParaLaConstancia === null) {
    return { fecha: '', estado: fila.notaDelPlazo ?? 'Sin plazo propio confirmado' };
  }
  return {
    fecha: formatearFecha(fila.plazoDeLaConstancia),
    estado: textoDeDias(fila.diasParaLaConstancia, fila.constanciaVencida, 'Vencida'),
  };
}

/** Rojo si ya pasó el plazo, amarillo si vence en 3 días o menos, neutro si no hay plazo o falta más. */
export function tonoDelPlazoDeLaConstancia(fila: ConstanciaPendiente): Tono {
  if (fila.constanciaVencida) return 'rojo';
  return fila.diasParaLaConstancia !== null && fila.diasParaLaConstancia <= 3 ? 'trigo' : 'tierra';
}

/** El entero del mes y grupo: enterado, vencido sin enterar o por vencer. */
export function estadoDelEnteroDeLaFila(fila: Pick<ConstanciaPendiente, 'enterado' | 'plazoVencido'>): {
  texto: string;
  tono: Tono;
} {
  if (fila.enterado) return { texto: 'Enterado', tono: 'campo' };
  return fila.plazoVencido ? { texto: 'Entero vencido', tono: 'rojo' } : { texto: 'Entero pendiente', tono: 'trigo' };
}

/** Las filas de un mes y grupo con lo que dice el servidor de su total. */
export interface BloqueDeMes {
  clave: string;
  titulo: string;
  nombreDelGrupo: string;
  plazoDelGrupo: string;
  textoDelPlazo: string;
  entero: { texto: string; tono: Tono };
  cantidad: number;
  retenido: string;
  filas: ConstanciaPendiente[];
}

const claveDe = (f: { mes: string; grupo: string }): string => `${f.mes}|${f.grupo}`;
const tituloDelMes = (mes: string): string => `${nombreDelMes(mes.slice(0, 7))} de ${mes.slice(0, 4)}`;

/** Junta las filas por mes y grupo, en el orden en que llegan; los totales salen del servidor. */
export function bloquesDePendientes(
  filas: readonly ConstanciaPendiente[],
  totales: readonly TotalPendiente[],
): BloqueDeMes[] {
  const bloques = new Map<string, BloqueDeMes>();
  for (const fila of filas) {
    const clave = claveDe(fila);
    const total = totales.find((t) => claveDe(t) === clave);
    const bloque = bloques.get(clave) ?? {
      clave,
      titulo: tituloDelMes(fila.mes),
      nombreDelGrupo: NOMBRES_CORTOS_DE_GRUPOS[fila.grupo] ?? fila.nombreDelGrupo,
      plazoDelGrupo: fila.plazoDelGrupo,
      textoDelPlazo: textoDeDias(fila.diasParaElPlazo, fila.plazoVencido),
      entero: estadoDelEnteroDeLaFila(fila),
      cantidad: total?.cantidad ?? 0,
      retenido: total?.retenido ?? '0.00',
      filas: [],
    };
    bloque.filas.push(fila);
    bloques.set(clave, bloque);
  }
  return [...bloques.values()];
}

/** Las cifras de arriba; los conteos de vencidas se sacan de las filas que ya trajo el servidor. */
export function cifrasDePendientes(reporte: ConstanciasPendientes): CifraDelResumen[] {
  const vencidas = reporte.pendientes.filter((f) => f.constanciaVencida).length;
  const sinEnterar = new Set(reporte.pendientes.filter((f) => f.plazoVencido && !f.enterado).map(claveDe)).size;
  return [
    { etiqueta: 'Retenido sin constancia', valor: formatearMonto(reporte.total.retenido), destacado: true },
    { etiqueta: reporte.total.cantidad === 1 ? 'Retención' : 'Retenciones', valor: String(reporte.total.cantidad) },
    { etiqueta: 'Constancias vencidas', valor: String(vencidas) },
    { etiqueta: 'Enteros vencidos sin pagar', valor: String(sinEnterar) },
    { etiqueta: 'Anuladas aparte', valor: String(reporte.anuladas.length) },
  ];
}

/** Lo retenido de las anuladas: aparte, no suma al total. */
export const retenidoDeAnuladas = (anuladas: readonly ConstanciaPendiente[]): string =>
  sumarMontos(anuladas.map((f) => f.retencion.retenido));

/** Las líneas del encabezado en papel: hasta qué mes y con qué filtros. */
export function lineasDeImpresionDePendientes(
  filtros: FiltrosDeConstanciasPendientes,
  nombreDelProveedor: string | null,
): string[] {
  const lineas = [`Retenciones sin constancia hasta ${tituloDelMes(`${filtros.hasta}-01`)}`];
  if (filtros.grupo) lineas.push(`Grupo: ${NOMBRES_CORTOS_DE_GRUPOS[filtros.grupo]}`);
  if (nombreDelProveedor) lineas.push(`Proveedor: ${nombreDelProveedor}`);
  return lineas;
}
