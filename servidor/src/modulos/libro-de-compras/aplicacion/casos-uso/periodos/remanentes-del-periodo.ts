import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { sumarMeses } from '../../../dominio/periodo-del-libro.js';
import type { FotoDelPeriodo } from '../../../dominio/periodos/foto-del-periodo.js';
import { nombreDelPeriodo } from '../../../dominio/periodos/nombre-del-periodo.js';
import type {
  FormularioConRemanente,
  RemanentesDeRetenciones,
  SaldosAnteriores,
  SaldosSupuestos,
} from '../../../dominio/periodos/remanentes-de-retenciones.js';
import type { RepositorioDePeriodos } from '../../puertos/puertos-de-periodos.js';

export interface PedidoDeRemanenteAnterior {
  /** `AAAA-MM-01`. */
  periodo: string;
  formulario: FormularioConRemanente;
  /** Lo que el usuario escribió al declarar; solo vale si el mes previo no dejó un cierre calculado. */
  escrito?: SaldosEscritos | undefined;
}

/** Lo que el usuario escribió: cada saldo que dejó vacío conserva el de la declaración anterior del período. */
export interface SaldosEscritos {
  retencionesCentavos?: number | undefined;
  creditoCentavos?: number | undefined;
}

type SaldosDeInicio = Pick<SaldosAnteriores, 'retencionesCentavos' | 'creditoCentavos'>;

const centavosODesconocido = (texto: string | null | undefined): number | null =>
  texto === null || texto === undefined ? null : aCentavos(texto);

/** La foto de la última declaración o rectificación del período (las reaperturas no llevan foto), si la hay. */
async function ultimaFotoDe(periodos: RepositorioDePeriodos, periodo: string): Promise<FotoDelPeriodo | null> {
  const historial = await periodos.historial(periodo);
  return historial.filter((declaracion) => declaracion.evento !== 'reapertura').at(-1)?.foto ?? null;
}

/** El formulario con que se calculó o se guardó la foto, si lo tiene. */
const formularioDeLaFoto = (foto: FotoDelPeriodo | null) =>
  foto?.remanentes?.formulario ?? foto?.saldosIniciales?.formulario;

/** El saldo guardado, o `null` si era un cero supuesto del primer mes. */
const dato = (monto: string, supuesto?: true): number | null => (supuesto ? null : aCentavos(monto));

/** Con lo que empezó el cálculo guardado en la foto; un cero supuesto del primer mes no cuenta como dato. */
const saldosDelCalculo = (calculado: RemanentesDeRetenciones): SaldosDeInicio => ({
  retencionesCentavos: dato(calculado.remanenteAnterior, calculado.supuestos?.retenciones),
  creditoCentavos: dato(calculado.creditoAnterior ?? '0.00', calculado.supuestos?.credito),
});

/** Con lo que empezó la foto: el remanente que calculó o, sin ventas, los saldos iniciales que guardó (puede faltar alguno). */
export function saldosDeInicioDeLaFoto(
  foto: FotoDelPeriodo | null,
  formulario: FormularioConRemanente,
): SaldosDeInicio | null {
  const calculado = foto?.remanentes;
  if (calculado?.formulario === formulario) return saldosDelCalculo(calculado);
  const guardado = foto?.saldosIniciales;
  if (guardado?.formulario !== formulario) return null;
  return {
    retencionesCentavos: centavosODesconocido(guardado.retenciones),
    creditoCentavos: centavosODesconocido(guardado.credito),
  };
}

/** El cierre CALCULADO del mes previo con el mismo formulario; los saldos iniciales de un mes sin ventas no son cierre. */
function cierreCalculado(foto: FotoDelPeriodo | null, formulario: FormularioConRemanente): SaldosDeInicio | null {
  const calculado = foto?.remanentes;
  if (calculado?.formulario !== formulario) return null;
  return {
    retencionesCentavos: aCentavos(calculado.remanenteAlSiguiente),
    creditoCentavos: aCentavos(calculado.creditoAlSiguiente ?? '0.00'),
  };
}

const primero = (...valores: Array<number | null | undefined>): number | null =>
  valores.find((valor): valor is number => valor !== null && valor !== undefined) ?? null;

/** Lo escrito reemplaza solo el saldo que trae; el que se dejó vacío queda como estaba (o sin dato). */
function conLoEscrito(base: SaldosDeInicio | null, escrito: SaldosEscritos | undefined): SaldosDeInicio {
  return {
    retencionesCentavos: primero(escrito?.retencionesCentavos, base?.retencionesCentavos),
    creditoCentavos: primero(escrito?.creditoCentavos, base?.creditoCentavos),
  };
}

/** Por qué no hay cierre del mes previo con qué empezar, y qué hacer; `null` si es el primer mes en Arrancar. */
async function avisoDeSaldoFaltante(
  periodos: RepositorioDePeriodos,
  pedido: PedidoDeRemanenteAnterior,
  previa: FotoDelPeriodo | null,
): Promise<string | null> {
  const previo = nombreDelPeriodo(sumarMeses(pedido.periodo, -1));
  if (!previa) {
    if (!(await periodos.hayDeclaracionesAntesDe(pedido.periodo))) return null;
    return `Falta declarar ${previo}; escriba el saldo del formulario o declare ese mes.`;
  }
  const formularioPrevio = formularioDeLaFoto(previa);
  if (formularioPrevio === pedido.formulario) {
    return `${previo} se declaró sin ventas y no se puede calcular con qué saldo cerró; escriba el saldo del formulario presentado.`;
  }
  return `${previo} se declaró con otro formulario: los saldos no se trasladan solos. Escriba el saldo del formulario y consulte a su contador.`;
}

/**
 * Los saldos con que empieza el período, en este orden: (1) el cierre calculado del mes previo con el mismo formulario;
 * (2) lo que escribió el usuario, cada saldo por separado; (3) con lo que ya empezó la última declaración del mismo
 * período, para que una rectificación no lo pierda. Si algún saldo sigue sin dato, es cero solo en el primer mes en
 * Arrancar (sin declaraciones anteriores); en otro caso queda «sin dato» (`null`) con un aviso.
 */
export async function remanenteAnteriorDelPeriodo(
  periodos: RepositorioDePeriodos,
  pedido: PedidoDeRemanenteAnterior,
): Promise<SaldosAnteriores> {
  const previa = await ultimaFotoDe(periodos, sumarMeses(pedido.periodo, -1));
  const cierre = cierreCalculado(previa, pedido.formulario);
  if (cierre) return cierre;
  const propia = saldosDeInicioDeLaFoto(await ultimaFotoDe(periodos, pedido.periodo), pedido.formulario);
  const saldos = conLoEscrito(propia, pedido.escrito);
  if (pedido.formulario === 'SAT-2046') saldos.creditoCentavos = 0;
  if (saldos.retencionesCentavos !== null && saldos.creditoCentavos !== null) return saldos;
  const aviso = await avisoDeSaldoFaltante(periodos, pedido, previa);
  if (aviso === null) return primerMes(saldos);
  return { ...saldos, aviso };
}

/** El primer mes en Arrancar: lo que falta es cero, pero se anota como supuesto para no guardarlo como dato. */
function primerMes(saldos: SaldosDeInicio): SaldosAnteriores {
  const supuestos: SaldosSupuestos = {
    ...(saldos.retencionesCentavos === null ? { retenciones: true as const } : {}),
    ...(saldos.creditoCentavos === null ? { credito: true as const } : {}),
  };
  return {
    retencionesCentavos: saldos.retencionesCentavos ?? 0,
    creditoCentavos: saldos.creditoCentavos ?? 0,
    ...(Object.keys(supuestos).length > 0 ? { supuestos } : {}),
  };
}
