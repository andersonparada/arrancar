import { numeroDeChequeOpcional } from './numero-de-cheque.esquema.js';
import { z } from 'zod';
import {
  decimalObligatorio,
  fechaObligatoria,
  idObligatorio,
  idOpcional,
  opcionObligatoria,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';
import type { Columna, OpcionDeReferencia } from '../../core/intercambio/aplicacion/columnas.js';
import type { ParteQueSeAgrega } from '../dominio/partes-de-apertura.js';

/** Las seis clases de partida del Excel; el error del banco va en dos: el que suma y el que resta. */
const CLASES = {
  cheque_en_circulacion: 'Cheque en circulación',
  deposito_en_transito: 'Depósito en tránsito',
  debito_en_transito: 'Débito en tránsito',
  error_del_banco_suma: 'Error del banco que suma',
  error_del_banco_resta: 'Error del banco que resta',
  cheque_posfechado: 'Cheque posfechado',
} as const;

type ClaseDeExcel = keyof typeof CLASES;

/** La parte y, en el error del banco, el sentido que corresponden a la clase escrita. */
export function deLaClase(clase: ClaseDeExcel): { parte: ParteQueSeAgrega; sentido: 'credito' | 'debito' | null } {
  if (clase === 'error_del_banco_suma') return { parte: 'error_del_banco', sentido: 'credito' };
  if (clase === 'error_del_banco_resta') return { parte: 'error_del_banco', sentido: 'debito' };
  return { parte: clase, sentido: null };
}

/** La clase de Excel de una partida ya guardada (para exportar). */
export function laClaseDe(parte: string, tipo: string): ClaseDeExcel {
  if (parte !== 'error_del_banco') return parte as ClaseDeExcel;
  return tipo === 'credito' ? 'error_del_banco_suma' : 'error_del_banco_resta';
}

const COLUMNAS_DEL_CHEQUE_Y_EL_ORIGEN: Columna[] = [
  { clave: 'clase', titulo: 'Clase', requerido: true, tipo: 'lista', opciones: CLASES },
  { clave: 'fecha', titulo: 'Fecha', requerido: true, tipo: 'fecha' },
  { clave: 'serie', titulo: 'Serie', requerido: false, tipo: 'texto' },
  { clave: 'numeroDeCheque', titulo: 'Número de cheque', requerido: false, tipo: 'entero' },
  { clave: 'beneficiario', titulo: 'Beneficiario u origen', requerido: false, tipo: 'texto' },
];

const COLUMNAS_DEL_DETALLE: Columna[] = [
  { clave: 'referencia', titulo: 'Referencia', requerido: false, tipo: 'texto' },
  { clave: 'monto', titulo: 'Monto', requerido: true, tipo: 'decimal' },
  { clave: 'observaciones', titulo: 'Observaciones', requerido: false, tipo: 'texto' },
];

type Opciones = Record<'cuentaBancariaId' | 'conceptoId', () => Promise<OpcionDeReferencia[]>>;

const columnaDeReferencia = (
  datos: Pick<Columna, 'clave' | 'titulo' | 'requerido'> & { campoDeNombre: string },
  opciones: () => Promise<OpcionDeReferencia[]>,
): Columna => ({ ...datos, tipo: 'referencia', opciones });

/** Las partidas de apertura en Excel: una fila por partida, de cualquier cuenta con saldo inicial. */
export const columnasDePartidasDeApertura = (opciones: Opciones): Columna[] => [
  columnaDeReferencia(
    { clave: 'cuentaBancariaId', titulo: 'Cuenta', requerido: true, campoDeNombre: 'cuentaNombre' },
    opciones.cuentaBancariaId,
  ),
  ...COLUMNAS_DEL_CHEQUE_Y_EL_ORIGEN,
  columnaDeReferencia(
    { clave: 'conceptoId', titulo: 'Concepto', requerido: false, campoDeNombre: 'conceptoNombre' },
    opciones.conceptoId,
  ),
  ...COLUMNAS_DEL_DETALLE,
];

/** Una fila del Excel de partidas, ya con su parte y su sentido. */
export const esquemaDePartidaEnExcel = z
  .object({
    cuentaBancariaId: idObligatorio(),
    clase: opcionObligatoria(Object.keys(CLASES) as [ClaseDeExcel, ...ClaseDeExcel[]]),
    fecha: fechaObligatoria(),
    serie: textoOpcional(20),
    numeroDeCheque: numeroDeChequeOpcional(),
    beneficiario: textoOpcional(150),
    conceptoId: idOpcional(),
    referencia: textoOpcional(150),
    monto: decimalObligatorio(2),
    observaciones: textoOpcional(500),
  })
  .transform(({ clase, ...resto }) => ({ ...resto, ...deLaClase(clase) }));

export type PartidaDeExcel = z.output<typeof esquemaDePartidaEnExcel>;

export const NOTAS_DE_PARTIDAS_DE_APERTURA = [
  'La cuenta debe tener ya su saldo según estado de cuenta (cárguelo primero con el Excel de saldos iniciales).',
  'Solo cheques ENTREGADOS al beneficiario antes de la fecha de corte. Un cheque firmado que sigue en la oficina no está en circulación: no lo cargue (el pago no se hizo).',
  'Todas las clases llevan fecha del día de corte o anterior, menos el cheque posfechado, que lleva una fecha posterior al corte y su Concepto de egreso.',
  'Cheque en circulación y posfechado piden Número de cheque y Beneficiario; el error del banco pide Referencia u Observaciones que lo describan.',
];
