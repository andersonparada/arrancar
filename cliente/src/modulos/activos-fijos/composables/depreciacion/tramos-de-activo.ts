import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { CausaDeTramo, TramoDeActivo } from '../../servicios/activos.api';
import { nombreDelMes } from './logica-de-cierre';

export type LibroDeDepreciacion = TramoDeActivo['libro'];

export const NOMBRES_DE_LIBRO: Record<LibroDeDepreciacion, string> = {
  contable: 'Libro contable',
  fiscal: 'Libro fiscal (ISR)',
};

const CAUSAS: Record<CausaDeTramo, string> = {
  inicio_de_uso: 'Inicio de uso',
  saldo_inicial: 'Saldo inicial',
  mejora: 'Mejora',
  costo_posterior: 'Costo posterior',
  revision_de_estimacion: 'Revisión de la estimación',
  cambio_de_matricula: 'Cambio de matrícula o catastro',
  division: 'División',
};

export const nombreDeCausa = (causa: CausaDeTramo): string => CAUSAS[causa] ?? causa;

/** Los tramos de un libro, del más antiguo al más reciente. */
export const tramosDelLibro = (tramos: readonly TramoDeActivo[], libro: LibroDeDepreciacion): TramoDeActivo[] =>
  tramos.filter((tramo) => tramo.libro === libro).sort((a, b) => a.desdePeriodo.localeCompare(b.desdePeriodo));

/** Cómo se deprecia el tramo: el contable en meses y el fiscal en porcentaje sobre su base. */
function regla(tramo: TramoDeActivo): DetalleDeRegistro {
  if (tramo.libro === 'contable') return { etiqueta: 'Vida útil', valor: `${tramo.meses ?? 0} meses` };
  const base = tramo.baseDelPorcentaje ? ` sobre ${formatearMonto(tramo.baseDelPorcentaje)}` : '';
  return { etiqueta: 'Porcentaje anual', valor: `${tramo.porcentaje ?? '0'} %${base}` };
}

/** Los datos de un tramo para la ficha, con formato; el exceso de nota de crédito solo aparece si lo hay. */
export function detallesDeTramo(tramo: TramoDeActivo): DetalleDeRegistro[] {
  const detalles: DetalleDeRegistro[] = [
    { etiqueta: 'Desde', valor: nombreDelMes(tramo.desdePeriodo) },
    { etiqueta: 'Por depreciar', valor: formatearMonto(tramo.porDepreciar) },
    { etiqueta: 'Valor residual', valor: formatearMonto(tramo.valorResidual) },
    regla(tramo),
    { etiqueta: 'Cuota mensual', valor: formatearMonto(tramo.cuotaMensual) },
  ];
  if (Number(tramo.excesoDeNotaDeCredito) > 0)
    detalles.push({ etiqueta: 'Exceso por nota de crédito', valor: formatearMonto(tramo.excesoDeNotaDeCredito) });
  return detalles;
}
