import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import type { ReporteDeContrasenasPorPagarDto } from '../aplicacion/dto/reportes-de-proveedor.dto.js';
import { fechaLegible } from '../dominio/avisos.js';

/** Una fila del Excel de R5: una contraseña, el total o una nota (fecha y filtro). */
export interface FilaExportadaDeContrasenas {
  seccion: string;
  contrasena: string;
  proveedor: string | null;
  fecha: string | null;
  pagoPrometido: string | null;
  diasDeAtraso: number | null;
  vence: string | null;
  documentosConSaldo: number | null;
  saldo: string | null;
  autorizado: string | null;
  sinAutorizar: string | null;
  comprometido: string | null;
  impresa: boolean | null;
}

const VACIA: Omit<FilaExportadaDeContrasenas, 'seccion' | 'contrasena'> = {
  proveedor: null,
  fecha: null,
  pagoPrometido: null,
  diasDeAtraso: null,
  vence: null,
  documentosConSaldo: null,
  saldo: null,
  autorizado: null,
  sinAutorizar: null,
  comprometido: null,
  impresa: null,
};

/** R5 en filas planas: las contraseñas, el total y, al final, el día y el filtro. */
export function aFilasExportadasDeContrasenas(reporte: ReporteDeContrasenasPorPagarDto): FilaExportadaDeContrasenas[] {
  const { totales } = reporte;
  return [
    ...reporte.filas.map((fila) => ({
      ...VACIA,
      ...fila,
      seccion: 'Contraseñas',
      contrasena: fila.numero,
      proveedor: fila.proveedorNombre,
    })),
    {
      ...VACIA,
      seccion: 'Total',
      contrasena: `${totales.cantidad} contraseñas`,
      saldo: totales.saldo,
      autorizado: totales.autorizado,
      sinAutorizar: totales.sinAutorizar,
    },
    {
      ...VACIA,
      seccion: 'Nota',
      contrasena: `Al ${fechaLegible(reporte.hoy)}, con pago prometido hasta el ${fechaLegible(reporte.pagoPrometidoHasta)}.`,
    },
  ];
}

const dinero = (clave: string, titulo: string): Columna => ({ clave, titulo, requerido: false, tipo: 'decimal' });
const fecha = (clave: string, titulo: string): Columna => ({ clave, titulo, requerido: false, tipo: 'fecha' });

/** Las columnas del Excel de R5: solo se exporta, nunca se importa. */
export const columnasDeContrasenasPorPagar: Columna[] = [
  { clave: 'seccion', titulo: 'Sección', requerido: true, tipo: 'texto' },
  { clave: 'contrasena', titulo: 'Contraseña', requerido: true, tipo: 'texto' },
  { clave: 'proveedor', titulo: 'Proveedor', requerido: false, tipo: 'texto' },
  fecha('fecha', 'Fecha'),
  fecha('pagoPrometido', 'Pago prometido'),
  { clave: 'diasDeAtraso', titulo: 'Días de atraso', requerido: false, tipo: 'entero' },
  fecha('vence', 'Vence'),
  { clave: 'documentosConSaldo', titulo: 'Documentos con saldo', requerido: false, tipo: 'entero' },
  dinero('saldo', 'Saldo'),
  dinero('autorizado', 'Autorizado'),
  dinero('sinAutorizar', 'Sin autorizar'),
  dinero('comprometido', 'Comprometido'),
  { clave: 'impresa', titulo: 'Impresa', requerido: false, tipo: 'siNo' },
];
