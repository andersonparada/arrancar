import type { Columna, OpcionDeReferencia } from '../../core/intercambio/aplicacion/columnas.js';

/** Las columnas del Excel de las cuentas bancarias: los mismos datos del formulario, en el mismo orden. */
export const columnasDeCuentasBancarias = (
  opciones: Record<'bancoId', () => Promise<OpcionDeReferencia[]>>,
): Columna[] => [
  { clave: 'nombre', titulo: 'Nombre corto', requerido: true, tipo: 'texto' },
  {
    clave: 'bancoId',
    titulo: 'Banco',
    requerido: true,
    tipo: 'referencia',
    campoDeNombre: 'bancoNombre',
    opciones: opciones.bancoId,
  },
  { clave: 'numero', titulo: 'Número de cuenta', requerido: true, tipo: 'texto' },
  {
    clave: 'tipo',
    titulo: 'Tipo',
    requerido: true,
    tipo: 'lista',
    opciones: { monetaria: 'Monetaria', ahorro: 'De ahorro' },
  },
  { clave: 'observaciones', titulo: 'Observaciones', requerido: false, tipo: 'texto' },
  { clave: 'activo', titulo: 'Activo', requerido: true, tipo: 'siNo' },
];
