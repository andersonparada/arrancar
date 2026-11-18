import type { z } from 'zod';
import type { Columna, OpcionDeReferencia } from '../../core/intercambio/aplicacion/columnas.js';
import { idObligatorio } from '../../core/compartido/http/esquemas-comunes.js';
import { esquemaGuardarSaldoInicial } from './saldos-iniciales.esquemas-http.js';

/** Cada fila del Excel es una cuenta: el saldo según el estado de cuenta y, para comparar, el de los libros anteriores. */
export const columnasDeSaldosIniciales = (
  opciones: Record<'cuentaBancariaId', () => Promise<OpcionDeReferencia[]>>,
): Columna[] => [
  {
    clave: 'cuentaBancariaId',
    titulo: 'Cuenta',
    requerido: true,
    tipo: 'referencia',
    campoDeNombre: 'cuentaNombre',
    opciones: opciones.cuentaBancariaId,
  },
  { clave: 'saldoSegunEstadoDeCuenta', titulo: 'Saldo según estado de cuenta', requerido: true, tipo: 'decimal' },
  {
    clave: 'saldoSegunLibrosAnteriores',
    titulo: 'Saldo de la cuenta contable en los libros anteriores',
    requerido: false,
    tipo: 'decimal',
  },
  { clave: 'observaciones', titulo: 'Observaciones', requerido: false, tipo: 'texto' },
];

/** Lo que solo trae el Excel exportado: el cuadre de cada cuenta (no se importa). */
export const columnasDelCuadreAlExportar: Columna[] = [
  { clave: 'fechaDeCorte', titulo: 'Fecha de corte', requerido: false, tipo: 'fecha' },
  { clave: 'totalDepositosEnTransito', titulo: 'Depósitos en tránsito', requerido: false, tipo: 'decimal' },
  { clave: 'totalChequesEnCirculacion', titulo: 'Cheques en circulación', requerido: false, tipo: 'decimal' },
  { clave: 'totalDebitosEnTransito', titulo: 'Débitos en tránsito', requerido: false, tipo: 'decimal' },
  { clave: 'totalErroresDelBanco', titulo: 'Errores del banco', requerido: false, tipo: 'decimal' },
  { clave: 'saldoEnLibrosAlCorte', titulo: 'Saldo en libros al corte', requerido: false, tipo: 'decimal' },
  { clave: 'diferencia', titulo: 'Diferencia con los libros anteriores', requerido: false, tipo: 'decimal' },
  { clave: 'tieneEvidencia', titulo: 'Tiene evidencia', requerido: false, tipo: 'siNo' },
];

/** El saldo inicial por cuenta, tal como llega de una fila del Excel. */
export const esquemaDeSaldoInicialEnExcel = esquemaGuardarSaldoInicial.extend({ cuentaBancariaId: idObligatorio() });

export type SaldoInicialDeExcel = z.output<typeof esquemaDeSaldoInicialEnExcel>;

export const NOTAS_DE_SALDOS_INICIALES = [
  'Solo crea el saldo inicial de las cuentas que todavía no lo tienen; para corregir uno use la pantalla de Saldos iniciales.',
  'El saldo según estado de cuenta es el del banco a la fecha de corte (el día anterior a la fecha de inicio); si el banco cobra de más, va con signo negativo.',
  'El saldo de la cuenta contable en los libros anteriores es solo para comparar: no cambia ningún saldo.',
];
