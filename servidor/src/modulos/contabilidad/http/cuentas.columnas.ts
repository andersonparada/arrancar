import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import {
  NOMBRES_DE_CLASE_DE_FLUJO,
  NOMBRES_DE_NATURALEZA,
  NOMBRES_DE_TRATAMIENTO,
} from '../dominio/clasificaciones-de-cuenta.js';
import { NOMBRES_DE_RUBRO } from '../dominio/rubros.js';

const siNo = (clave: string, titulo: string): Columna => ({ clave, titulo, requerido: true, tipo: 'siNo' });

/**
 * Las columnas del Excel de las cuentas: los mismos datos del formulario, en el mismo orden. La cuenta superior sale
 * del código, así que las filas se escriben de arriba hacia abajo (cada cuenta después de la suya superior).
 */
export const columnasDeCuentas: Columna[] = [
  { clave: 'codigo', titulo: 'Código', requerido: true, tipo: 'texto' },
  { clave: 'nombre', titulo: 'Nombre', requerido: true, tipo: 'texto' },
  siNo('esDeDetalle', 'Es de detalle'),
  { clave: 'naturaleza', titulo: 'Naturaleza', requerido: true, tipo: 'lista', opciones: NOMBRES_DE_NATURALEZA },
  {
    clave: 'tipo',
    titulo: 'Tipo',
    requerido: true,
    tipo: 'lista',
    opciones: { balance: 'Balance', resultados: 'Resultados' },
  },
  { clave: 'rubro', titulo: 'Rubro', requerido: false, tipo: 'lista', opciones: NOMBRES_DE_RUBRO },
  siNo('corriente', 'Corriente'),
  {
    clave: 'claseDeFlujo',
    titulo: 'Clase de flujo',
    requerido: false,
    tipo: 'lista',
    opciones: NOMBRES_DE_CLASE_DE_FLUJO,
  },
  siNo('esMonetaria', 'Es monetaria'),
  siNo('pideTercero', 'Pide tercero'),
  siNo('pideCentroDeCosto', 'Pide centro de costo'),
  siNo('esDeControl', 'Es de control'),
  {
    clave: 'tratamientoFiscal',
    titulo: 'Tratamiento fiscal',
    requerido: true,
    tipo: 'lista',
    opciones: NOMBRES_DE_TRATAMIENTO,
  },
  siNo('activo', 'Activa'),
];
