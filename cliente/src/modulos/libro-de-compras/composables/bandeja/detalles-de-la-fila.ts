import type { DteRecibido } from '../../servicios/dte-recibidos.api';
import { DESTINOS_DE_DOCUMENTO } from '../../textos-de-documentos';
import { ANTERIORES_A_LA_FECHA_DE_INICIO as textos } from '../../textos-de-anteriores';
import { FALTANTES, MOTIVOS_DE_BLOQUEO } from '../../textos-de-la-bandeja';
import { marcaDeAnterioridad } from './anteriores-a-la-fecha-de-inicio';
import { faltantesDeLaFila, tieneProveedorNuevo, valoresDeLaFila } from './datos-de-la-bandeja';

export interface InsigniaDeLaFila {
  texto: string;
  tono: 'campo' | 'trigo' | 'tierra' | 'rojo';
}

/** Las etiquetas que avisan lo importante de la fila a primera vista. */
export function insigniasDeLaFila(fila: DteRecibido): InsigniaDeLaFila[] {
  const insignias: InsigniaDeLaFila[] = [];
  const anterior = marcaDeAnterioridad(fila);
  if (anterior) insignias.push(anterior);
  if (fila.estadoSat === 'anulado') insignias.push({ texto: 'Anulado en la SAT', tono: 'rojo' });
  if (tieneProveedorNuevo(fila)) insignias.push({ texto: 'Proveedor nuevo', tono: 'trigo' });
  if (fila.estado === 'bloqueado') insignias.push({ texto: 'Bloqueado', tono: 'tierra' });
  if (fila.estado === 'registrado') insignias.push({ texto: 'Registrado', tono: 'campo' });
  return insignias;
}

export interface DatoDeLaFila {
  etiqueta: string;
  valor: string;
}

const SIN_ELEGIR = 'Sin elegir';

/** Lo que valdría para la fila hoy: lo completado o, si falta, lo propuesto. Las fechas ya vienen formateadas. */
export function datosDeLaFilaPendiente(
  fila: DteRecibido,
  conceptos: ReadonlyMap<string, string>,
  formatearFecha: (fecha: string) => string,
): DatoDeLaFila[] {
  const valores = valoresDeLaFila(fila);
  const concepto = valores.conceptoId ? (conceptos.get(valores.conceptoId) ?? SIN_ELEGIR) : SIN_ELEGIR;
  return [
    { etiqueta: 'Concepto', valor: concepto },
    { etiqueta: 'Destino', valor: valores.destino ? DESTINOS_DE_DOCUMENTO[valores.destino] : SIN_ELEGIR },
    { etiqueta: 'Recepción', valor: valores.fechaRecepcion ? formatearFecha(valores.fechaRecepcion) : SIN_ELEGIR },
    { etiqueta: 'Período', valor: valores.periodo ? valores.periodo.slice(0, 7) : SIN_ELEGIR },
  ];
}

/** Lo que falta para confirmar, como una frase; vacío si no falta nada. */
export function textoDeLoQueFalta(fila: DteRecibido, conFechaDeInicio = false): string {
  const faltan = faltantesDeLaFila(fila);
  if (!faltan.length) return '';
  const nota = conFechaDeInicio && faltan.includes(FALTANTES.factura) ? ` ${textos.notaSinFactura}` : '';
  return `Falta ${faltan.join(', ')}.${nota}`;
}

/** El aviso que acompaña a una fila que no está pendiente (por qué está bloqueada o descartada). */
export function notaDeLaFila(fila: DteRecibido): string {
  if (fila.estado === 'bloqueado') return MOTIVOS_DE_BLOQUEO[fila.motivoDeBloqueo ?? ''] ?? '';
  return fila.estado === 'descartado' && fila.motivoDeDescarte ? `Motivo: ${fila.motivoDeDescarte}` : '';
}
