import { esTerreno, type IncisoFiscal } from '../incisos-fiscales.js';
import { ParametrosDeUsoInvalidos } from '../errores-de-depreciacion.js';
import { dividirRedondeando } from './redondeo.js';

/** Lo que de la clase propone los parámetros de un activo al ponerlo en uso (§3.5). */
export interface ClaseParaProponer {
  incisoFiscal: IncisoFiscal;
  porcentajeFiscal: string;
  vidaUtilContableMeses: number | null;
  valorResidualPorcentaje: string;
}

/** Los parámetros con los que un activo empieza a depreciarse; se proponen de la clase y el usuario los puede cambiar. */
export interface ParametrosDeUso {
  porcentajeFiscal: string;
  vidaUtilContableMeses: number | null;
  valorResidualCentavos: number;
}

export interface EntradaDePropuesta {
  clase: ClaseParaProponer;
  costoCentavos: number;
  /** Valor como ganado común en reproductores (V-9): es el residual por omisión. */
  valorComoGanadoComunCentavos: number | null;
}

const VIDA_UTIL_MAXIMA = 1200;

/**
 * Lo que propone la clase: su porcentaje fiscal; su vida útil o, si no la da, la que equivale al porcentaje fiscal
 * (`round(1200 / %)` meses); y su residual sobre el costo (en reproductores, el valor como ganado común).
 * Los terrenos no se deprecian: sin vida útil ni residual.
 */
export function proponerParametrosDeUso({
  clase,
  costoCentavos,
  valorComoGanadoComunCentavos,
}: EntradaDePropuesta): ParametrosDeUso {
  if (esTerreno(clase.incisoFiscal))
    return { porcentajeFiscal: '0.00', vidaUtilContableMeses: null, valorResidualCentavos: 0 };
  const porcentaje = Number(clase.porcentajeFiscal);
  const equivalente = porcentaje > 0 ? dividirRedondeando(120000, Math.round(porcentaje * 100)) : null;
  const residualDeClase = dividirRedondeando(
    BigInt(costoCentavos) * BigInt(Math.round(Number(clase.valorResidualPorcentaje) * 100)),
    10000,
  );
  return {
    porcentajeFiscal: clase.porcentajeFiscal,
    vidaUtilContableMeses: clase.vidaUtilContableMeses ?? equivalente,
    valorResidualCentavos: valorComoGanadoComunCentavos ?? residualDeClase,
  };
}

export interface EntradaDeValidacion {
  incisoFiscal: IncisoFiscal;
  parametros: ParametrosDeUso;
  /** El máximo de ley del inciso, en %. */
  porcentajeMaximo: number;
  costoCentavos: number;
}

function validarPorcentaje(porcentajeFiscal: string, porcentajeMaximo: number): void {
  const porcentaje = Number(porcentajeFiscal);
  if (!(porcentaje > 0)) throw new ParametrosDeUsoInvalidos('El porcentaje fiscal debe ser mayor que cero.');
  if (porcentaje > porcentajeMaximo)
    throw new ParametrosDeUsoInvalidos(
      `El porcentaje fiscal no puede pasar del máximo de ley (${porcentajeMaximo} %).`,
    );
}

function validarVidaYResidual(
  { vidaUtilContableMeses: vida, valorResidualCentavos: residual }: ParametrosDeUso,
  costo: number,
) {
  if (vida === null || !Number.isInteger(vida) || vida < 1 || vida > VIDA_UTIL_MAXIMA)
    throw new ParametrosDeUsoInvalidos(`La vida útil contable va de 1 a ${VIDA_UTIL_MAXIMA} meses.`);
  if (residual < 0 || residual > costo)
    throw new ParametrosDeUsoInvalidos('El valor residual no puede ser negativo ni pasar del costo del activo.');
}

/**
 * @throws ParametrosDeUsoInvalidos si el porcentaje pasa del máximo de ley o es cero, si la vida útil no va de 1 a 1200
 * meses o si el residual es negativo o pasa del costo.
 */
export function validarParametrosDeUso({
  incisoFiscal,
  parametros,
  porcentajeMaximo,
  costoCentavos,
}: EntradaDeValidacion): void {
  if (esTerreno(incisoFiscal)) return;
  validarPorcentaje(parametros.porcentajeFiscal, porcentajeMaximo);
  validarVidaYResidual(parametros, costoCentavos);
}
