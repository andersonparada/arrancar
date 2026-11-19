import { deCentavos } from '../dominio/centavos.js';
import type {
  CausaDelAnulado,
  EstadoDelNumero,
  NumeroDeChequeDto,
  ResumenDeCorrelativosDeCheques,
} from './dto/correlativos-de-cheques.dto.js';
import type { ChequeDelCorrelativo } from './puertos/consultas-de-correlativos-de-cheques.js';

export const NOTA_DEL_CONTEO_FISICO =
  'Lo cuenta alguien distinto de quien emite los cheques. El sistema no guarda el conteo: es papel firmado.';

interface RangoDeLaChequera {
  desde: number;
  hasta: number;
  deApertura: boolean;
}

const estadoDe = (cheque: ChequeDelCorrelativo): EstadoDelNumero =>
  cheque.estado === 'anulado' && cheque.causa === 'inutilizado' ? 'inutilizado' : cheque.estado;

/** La causa solo se dice de un anulado que no es inutilizado (ese tiene su propio estado). */
const causaDe = (cheque: ChequeDelCorrelativo): CausaDelAnulado | null =>
  cheque.estado === 'anulado' && cheque.causa !== 'inutilizado' ? (cheque.causa as CausaDelAnulado) : null;

/** El movimiento del cheque, si lo tiene: fecha, beneficiario y monto. */
const deSuMovimiento = (cheque: ChequeDelCorrelativo) => ({
  fecha: cheque.movimiento?.fecha ?? null,
  beneficiario: cheque.movimiento?.beneficiario ?? null,
  monto: cheque.movimiento ? deCentavos(cheque.movimiento.montoCentavos) : null,
});

/** Un número del rango. `pasoAlNumero` solo existe en un inutilizado y sale de la auditoría. */
function numeroDelReporte(cheque: ChequeDelCorrelativo, pasaron: ReadonlyMap<string, number>): NumeroDeChequeDto {
  const estado = estadoDe(cheque);
  return {
    numero: cheque.numero,
    estado,
    causa: causaDe(cheque),
    ...deSuMovimiento(cheque),
    impreso: cheque.impresoEn !== null,
    impresoEn: cheque.impresoEn ? cheque.impresoEn.toISOString() : null,
    motivoDeAnulacion: cheque.motivoDeAnulacion,
    pasoAlNumero: estado === 'inutilizado' ? (pasaron.get(cheque.id) ?? null) : null,
  };
}

const numeroSinRegistro = (numero: number): NumeroDeChequeDto => ({
  numero,
  estado: 'sin_registro',
  causa: null,
  fecha: null,
  beneficiario: null,
  monto: null,
  impreso: false,
  impresoEn: null,
  motivoDeAnulacion: null,
  pasoAlNumero: null,
});

/**
 * Todos los números de `desde` a `hasta`, en orden: los que tienen cheque con su detalle y los que no, como
 * `sin_registro` (un número sin fila es una alerta). La chequera de la carga inicial solo muestra lo que tiene: su rango
 * tiene huecos por diseño.
 */
export function numerosDelReporte(
  cheques: readonly ChequeDelCorrelativo[],
  rango: RangoDeLaChequera,
  pasaron: ReadonlyMap<string, number>,
): NumeroDeChequeDto[] {
  const porNumero = new Map(cheques.map((cheque) => [cheque.numero, cheque]));
  const numeros = rango.deApertura
    ? [...porNumero.keys()].sort((a, b) => a - b)
    : Array.from({ length: rango.hasta - rango.desde + 1 }, (_, indice) => rango.desde + indice);
  return numeros.map((numero) => {
    const cheque = porNumero.get(numero);
    return cheque ? numeroDelReporte(cheque, pasaron) : numeroSinRegistro(numero);
  });
}

const contar = (numeros: readonly NumeroDeChequeDto[], estado: EstadoDelNumero, causa?: CausaDelAnulado): number =>
  numeros.filter((n) => n.estado === estado && (causa === undefined || n.causa === causa)).length;

/** El resumen de la chequera: cada estado y causa, el total del rango y la alerta si un número no tiene fila. */
export function resumenDelReporte(
  numeros: readonly NumeroDeChequeDto[],
  rango: RangoDeLaChequera,
): ResumenDeCorrelativosDeCheques {
  const sinRegistro = numeros.filter(({ estado }) => estado === 'sin_registro').map(({ numero }) => numero);
  const manual = contar(numeros, 'anulado', 'manual');
  const caducidad = contar(numeros, 'anulado', 'caducidad');
  const extraviado = contar(numeros, 'anulado', 'extraviado');
  return {
    emitidos: contar(numeros, 'emitido'),
    anulados: { total: manual + caducidad + extraviado, manual, caducidad, extraviado },
    inutilizados: contar(numeros, 'inutilizado'),
    disponibles: contar(numeros, 'disponible'),
    totalDelRango: rango.deApertura ? numeros.length : rango.hasta - rango.desde + 1,
    alerta:
      sinRegistro.length > 0
        ? `Alerta: no hay cheque registrado para ${sinRegistro.length === 1 ? 'el número' : 'los números'} ${sinRegistro.join(', ')}.`
        : null,
  };
}
