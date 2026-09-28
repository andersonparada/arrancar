import type { Columna, OpcionDeReferencia } from '../../core/intercambio/aplicacion/columnas.js';

/** Las columnas del Excel de los movimientos: los mismos datos del formulario, en el mismo orden. */
export const columnasDeMovimientos = (
  opciones: Record<'cuentaBancariaId', () => Promise<OpcionDeReferencia[]>>,
): Columna[] => [
  {
    clave: 'cuentaBancariaId',
    titulo: 'Cuenta',
    requerido: true,
    tipo: 'referencia',
    campoDeNombre: 'cuentaBancariaNombre',
    opciones: opciones.cuentaBancariaId,
  },
  {
    clave: 'tipo',
    titulo: 'Tipo',
    requerido: true,
    tipo: 'lista',
    opciones: { credito: 'Nota de crédito', debito: 'Nota de débito' },
  },
  { clave: 'fecha', titulo: 'Fecha', requerido: true, tipo: 'fecha' },
  { clave: 'monto', titulo: 'Monto', requerido: true, tipo: 'decimal' },
  { clave: 'saldoInicial', titulo: 'Saldo inicial', requerido: true, tipo: 'siNo' },
  { clave: 'referencia', titulo: 'Referencia', requerido: false, tipo: 'texto' },
  { clave: 'beneficiario', titulo: 'Beneficiario u origen', requerido: false, tipo: 'texto' },
  { clave: 'observaciones', titulo: 'Observaciones', requerido: false, tipo: 'texto' },
];
