import { SaldoInicialInvalido } from '../errores-de-saldo-inicial.js';
import { esTerreno, type IncisoFiscal } from '../incisos-fiscales.js';

/** Lo que el activo traía al día de corte, todo en centavos enteros (diseño §5.6 y §8). */
export interface DatosDeSaldoInicial {
  costoCentavos: number;
  acumuladaContableCentavos: number;
  /** El costo que se recupera al vender; puede diferir del contable (A1). */
  costoFiscalCentavos: number;
  /** Lo que se deprecia en el libro fiscal (con el tope del inmueble y sin el ganado común). */
  baseFiscalCentavos: number;
  acumuladaFiscalCentavos: number;
  valorResidualCentavos: number;
  porcentajeFiscal: string;
  /** Meses que faltan por depreciar en el libro contable; nulo en terrenos y en obras sin terminar. */
  vidaUtilRestanteMeses: number | null;
}

export interface ReglasDelSaldoInicial {
  incisoFiscal: IncisoFiscal;
  /** La obra no se terminó: entra al balance sin depreciar. */
  enConstruccion: boolean;
  /** El máximo de ley del inciso, en %. */
  porcentajeMaximo: number;
}

const VIDA_MAXIMA = 1200;

/** @throws SaldoInicialInvalido si no se cumple. */
export function exigirDelSaldo(cumple: boolean, mensaje: string): void {
  if (!cumple) throw new SaldoInicialInvalido(mensaje);
}

const entre = (valor: number, maximo: number): boolean => valor >= 0 && valor <= maximo;

function validarContable(datos: DatosDeSaldoInicial): void {
  exigirDelSaldo(datos.costoCentavos > 0, 'El costo del saldo inicial debe ser mayor que cero.');
  exigirDelSaldo(
    entre(datos.acumuladaContableCentavos, datos.costoCentavos),
    'La depreciación acumulada contable no puede ser negativa ni pasar del costo.',
  );
  exigirDelSaldo(
    entre(datos.valorResidualCentavos, datos.costoCentavos),
    'El valor residual no puede ser negativo ni pasar del costo.',
  );
}

function validarFiscal(datos: DatosDeSaldoInicial): void {
  exigirDelSaldo(
    entre(datos.baseFiscalCentavos, datos.costoFiscalCentavos),
    'La base fiscal no puede ser negativa ni pasar del costo fiscal.',
  );
  exigirDelSaldo(
    entre(datos.acumuladaFiscalCentavos, datos.baseFiscalCentavos),
    'La depreciación acumulada fiscal no puede ser negativa ni pasar de la base fiscal.',
  );
}

function validarParametros(datos: DatosDeSaldoInicial, porcentajeMaximo: number): void {
  const porcentaje = Number(datos.porcentajeFiscal);
  exigirDelSaldo(porcentaje > 0, 'El porcentaje fiscal debe ser mayor que cero.');
  exigirDelSaldo(
    porcentaje <= porcentajeMaximo,
    `El porcentaje fiscal no puede pasar del máximo de ley (${porcentajeMaximo} %).`,
  );
  const vida = datos.vidaUtilRestanteMeses;
  const valida = vida !== null && Number.isInteger(vida) && entre(vida, VIDA_MAXIMA);
  exigirDelSaldo(valida, `La vida útil restante va de 0 a ${VIDA_MAXIMA} meses (0 si ya se agotó).`);
}

/** Un terreno no se deprecia: ni base, ni acumuladas, ni vida, ni residual, ni porcentaje. */
function normalizarTerreno(datos: DatosDeSaldoInicial): DatosDeSaldoInicial {
  const conAcumulada = datos.acumuladaContableCentavos > 0 || datos.acumuladaFiscalCentavos > 0;
  exigirDelSaldo(!conAcumulada, 'Un terreno no se deprecia: no puede traer depreciación acumulada.');
  return {
    ...datos,
    baseFiscalCentavos: 0,
    acumuladaFiscalCentavos: 0,
    valorResidualCentavos: 0,
    porcentajeFiscal: '0.00',
    vidaUtilRestanteMeses: null,
  };
}

/** Una obra sin terminar todavía no se deprecia: sin acumuladas y sin vida restante. */
function normalizarObra(datos: DatosDeSaldoInicial): DatosDeSaldoInicial {
  const conAcumulada = datos.acumuladaContableCentavos > 0 || datos.acumuladaFiscalCentavos > 0;
  exigirDelSaldo(!conAcumulada, 'Una obra en construcción todavía no se deprecia: sin depreciación acumulada.');
  return { ...datos, vidaUtilRestanteMeses: null, valorResidualCentavos: 0 };
}

/**
 * Revisa los montos del saldo inicial (§5.6) y los deja normalizados: los terrenos y las obras en construcción no
 * traen depreciación ni vida restante.
 * @throws SaldoInicialInvalido si algo no cumple.
 */
export function validarSaldoInicial(datos: DatosDeSaldoInicial, reglas: ReglasDelSaldoInicial): DatosDeSaldoInicial {
  validarContable(datos);
  exigirDelSaldo(datos.costoFiscalCentavos > 0, 'El costo fiscal debe ser mayor que cero.');
  if (esTerreno(reglas.incisoFiscal)) return normalizarTerreno(datos);
  validarFiscal(datos);
  if (reglas.enConstruccion) return normalizarObra(datos);
  validarParametros(datos, reglas.porcentajeMaximo);
  return datos;
}

/** El día anterior a la fecha de inicio de la empresa: hasta él llegan los saldos (`aaaa-mm-dd`). */
export function fechaDeCorteDe(fechaDeInicio: string): string {
  const dia = new Date(`${fechaDeInicio}T00:00:00Z`);
  dia.setUTCDate(dia.getUTCDate() - 1);
  return dia.toISOString().slice(0, 10);
}
