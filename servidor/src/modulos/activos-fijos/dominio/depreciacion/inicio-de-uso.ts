import { abrirTramoContable } from './libro-contable.js';
import { abrirTramoFiscal } from './libro-fiscal.js';
import { primerMesDelTramo, type PrimerMes } from './meses.js';
import type { TramoCalculado } from './tramo.js';

export interface EntradaDeInicioDeUso {
  fechaDeInicioDeUso: string;
  primerMes: PrimerMes;
  /** Σ de los costos vigentes (libro contable). */
  costoCentavos: number;
  /** La base fiscal `B`, con el tope del inmueble y sin el ganado común. */
  baseFiscalCentavos: number;
  porcentajeFiscal: string;
  vidaUtilContableMeses: number;
  valorResidualCentavos: number;
}

/**
 * Los dos tramos `inicio_de_uso` de un activo que se pone en uso (§6.4): sin depreciación acumulada, porque nunca se
 * ha depreciado, y con el primer mes que manda la regla de la empresa (§7.1). La base del porcentaje es la base fiscal.
 */
export function tramosDeInicioDeUso(entrada: EntradaDeInicioDeUso): {
  contable: TramoCalculado;
  fiscal: TramoCalculado;
} {
  const desdePeriodo = primerMesDelTramo(entrada.fechaDeInicioDeUso, entrada.primerMes);
  return {
    contable: abrirTramoContable({
      desdePeriodo,
      causa: 'inicio_de_uso',
      costoCentavos: entrada.costoCentavos,
      acumuladaCentavos: 0,
      valorResidualCentavos: entrada.valorResidualCentavos,
      meses: entrada.vidaUtilContableMeses,
    }),
    fiscal: abrirTramoFiscal({
      desdePeriodo,
      causa: 'inicio_de_uso',
      baseFiscalCentavos: entrada.baseFiscalCentavos,
      acumuladaCentavos: 0,
      porcentaje: entrada.porcentajeFiscal,
    }),
  };
}
