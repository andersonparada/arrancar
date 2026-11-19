import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearFechaHora, formatearMonto, formatearTexto } from '@/modulos/core/utilidades/formato';
import type { Cierre, Hallazgo, RevisionDelCierre } from '../../servicios/depreciacion.api';

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/** «2026-03-01» se lee «Marzo 2026»; lo que no es un mes se deja como llegó. */
export function nombreDelMes(periodo: string): string {
  const [anio, mes] = periodo.split('-');
  const nombre = MESES[Number(mes) - 1];
  return nombre && anio ? `${nombre} ${anio}` : periodo;
}

/** Los cierres del más reciente al más antiguo. */
export const cierresRecientesPrimero = (cierres: readonly Cierre[]): Cierre[] =>
  [...cierres].sort((a, b) => b.periodo.localeCompare(a.periodo));

/**
 * El único mes que se puede reabrir según §6.9: el último cerrado (los reabiertos no cuentan). El servidor lo valida
 * de todos modos; aquí solo se evita ofrecer el botón en meses que no lo admiten.
 */
export function mesReabrible(cierres: readonly Cierre[]): string | null {
  const cerrados = cierres.filter((cierre) => cierre.estado === 'cerrado');
  return cierresRecientesPrimero(cerrados)[0]?.periodo ?? null;
}

/** Los hallazgos que bloquean van primero. */
export const hallazgosOrdenados = (hallazgos: readonly Hallazgo[]): Hallazgo[] =>
  [...hallazgos].sort((a, b) => Number(b.nivel === 'bloquea') - Number(a.nivel === 'bloquea'));

const MAXIMO_DE_CODIGOS = 8;

/** Los activos afectados por un hallazgo: los primeros códigos y cuántos faltan por nombrar. */
export function activosDelHallazgo(hallazgo: Hallazgo): string {
  if (hallazgo.detalle.length === 0) return '';
  const nombrados = hallazgo.detalle.slice(0, MAXIMO_DE_CODIGOS);
  const restantes = Math.max(hallazgo.cantidad, hallazgo.detalle.length) - nombrados.length;
  return restantes > 0 ? `${nombrados.join(', ')} y ${restantes} más` : nombrados.join(', ');
}

/** Lo que va a pasar al confirmar el cierre, en una frase. */
export function resumenDeCierre({ periodo, totales }: Pick<RevisionDelCierre, 'periodo' | 'totales'>): string {
  const { activosDepreciados, contable, fiscal } = totales;
  const mes = nombreDelMes(periodo);
  if (activosDepreciados === 0) return `En ${mes} no hay activos por depreciar: se cerrará el mes sin cuotas.`;
  const activos = activosDepreciados === 1 ? '1 activo' : `${activosDepreciados} activos`;
  return `Se calculará la cuota de ${activos} en ${mes}: ${formatearMonto(contable)} contable y ${formatearMonto(fiscal)} fiscal.`;
}

/** Cuántos hallazgos de cada nivel hay. */
export function contarHallazgos(hallazgos: readonly Hallazgo[]): { bloqueos: number; avisos: number } {
  const bloqueos = hallazgos.filter((hallazgo) => hallazgo.nivel === 'bloquea').length;
  return { bloqueos, avisos: hallazgos.length - bloqueos };
}

/** Los datos de un mes cerrado para su tarjeta, con formato. */
export function detallesDeCierre(cierre: Cierre): DetalleDeRegistro[] {
  const detalles: DetalleDeRegistro[] = [
    { etiqueta: 'Depreciación contable', valor: formatearMonto(cierre.totalContable) },
    { etiqueta: 'Depreciación fiscal', valor: formatearMonto(cierre.totalFiscal) },
    { etiqueta: 'Activos depreciados', valor: String(cierre.activosDepreciados) },
    { etiqueta: 'Cerrado', valor: `${formatearFechaHora(cierre.cerradoEn)} por ${cierre.cerradoPor}` },
  ];
  if (cierre.estado !== 'reabierto') return detalles;
  const reabierto = `${formatearFechaHora(cierre.reabiertoEn)} por ${formatearTexto(cierre.reabiertoPor)}`;
  return [
    ...detalles,
    { etiqueta: 'Reabierto', valor: reabierto },
    { etiqueta: 'Motivo de la reapertura', valor: formatearTexto(cierre.motivoDeReapertura), largo: true },
  ];
}
