import { VidaUtilRestanteRequerida } from '../errores-de-mejora.js';
import { acumuladaAntesDe, mesesQueFaltan, type EstadoDeLosLibros } from './estado-de-los-libros.js';
import { abrirTramoContable } from './libro-contable.js';
import { abrirTramoFiscal } from './libro-fiscal.js';
import type { CausaDeTramo, TramoCalculado } from './tramo.js';

/** Las causas con que un activo en uso cambia su depreciación hacia adelante (§5.8). */
export type CausaDeCambio = Extract<
  CausaDeTramo,
  'mejora' | 'costo_posterior' | 'revision_de_estimacion' | 'cambio_de_matricula'
>;

export interface EntradaDeCambio {
  estado: EstadoDeLosLibros;
  causa: CausaDeCambio;
  /** El primer mes que usa el tramo nuevo (§7.1): nunca antes del primer mes abierto. */
  desdePeriodo: string;
  /** Σ de los costos vigentes, con los nuevos (libro contable). */
  costoCentavos: number;
  /** La base fiscal `B` con los costos nuevos, el tope del inmueble y sin el ganado común. */
  baseFiscalCentavos: number;
  porcentajeFiscal: string;
  valorResidualCentavos: number;
  /** La vida contable que queda, si quien registra la dio; sin ella sigue la del tramo anterior. */
  vidaRestanteMeses: number | null;
}

/** Los tramos que nacen del cambio; un libro que el cambio no toca viene `null`. */
export interface TramosDeCambio {
  contable: TramoCalculado | null;
  fiscal: TramoCalculado | null;
}

function tramoContable(entrada: EntradaDeCambio): TramoCalculado {
  const { estado, causa, desdePeriodo } = entrada;
  const meses = entrada.vidaRestanteMeses ?? mesesQueFaltan(estado.tramos, desdePeriodo);
  if (meses === null) throw new VidaUtilRestanteRequerida();
  return abrirTramoContable({
    desdePeriodo,
    causa,
    costoCentavos: entrada.costoCentavos,
    acumuladaCentavos: acumuladaAntesDe(estado, 'contable', desdePeriodo),
    valorResidualCentavos: entrada.valorResidualCentavos,
    meses,
  });
}

/**
 * En una mejora el porcentaje se aplica sobre lo que falta por depreciar más lo nuevo («la nueva base es el saldo no
 * depreciado más la mejora», art. 26); en un costo posterior y en un cambio de matrícula, sobre la base fiscal total ya
 * corregida, sin reiniciar la vida (V-3).
 */
function tramoFiscal(entrada: EntradaDeCambio): TramoCalculado {
  const { estado, causa, desdePeriodo, baseFiscalCentavos } = entrada;
  const acumuladaCentavos = acumuladaAntesDe(estado, 'fiscal', desdePeriodo);
  const baseDelPorcentajeCentavos =
    causa === 'mejora' ? Math.max(baseFiscalCentavos - acumuladaCentavos, 0) : baseFiscalCentavos;
  return abrirTramoFiscal({
    desdePeriodo,
    causa,
    baseFiscalCentavos,
    acumuladaCentavos,
    porcentaje: entrada.porcentajeFiscal,
    baseDelPorcentajeCentavos,
  });
}

/**
 * Los tramos de un cambio de depreciación hacia adelante (§6.5 y §6.6): una mejora o un costo posterior abre los dos
 * libros; la revisión de la estimación, solo el contable; el cambio de matrícula, solo el fiscal. Puro: no toca la base.
 * @throws VidaUtilRestanteRequerida si el libro contable ya agotó su vida y nadie dijo cuánta queda.
 */
export function tramosDeCambio(entrada: EntradaDeCambio): TramosDeCambio {
  const { causa } = entrada;
  return {
    contable: causa === 'cambio_de_matricula' ? null : tramoContable(entrada),
    fiscal: causa === 'revision_de_estimacion' ? null : tramoFiscal(entrada),
  };
}
