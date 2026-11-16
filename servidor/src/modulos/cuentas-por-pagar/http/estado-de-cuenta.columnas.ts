import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import type { EstadoDeCuentaDto, LineaDelEstadoDto } from '../aplicacion/dto/reportes-de-proveedor.dto.js';
import { fechaLegible } from '../dominio/avisos.js';

/** Una fila del Excel de R3: el saldo anterior, una línea, los totales o una nota (proveedor, rango, avisos, leyendas). */
export interface FilaExportadaDeEstadoDeCuenta {
  seccion: string;
  fecha: string | null;
  concepto: string;
  total: string | null;
  retenciones: string | null;
  anterioresAlInicio: string | null;
  cargo: string | null;
  abono: string | null;
  saldo: string | null;
}

const VACIA: Omit<FilaExportadaDeEstadoDeCuenta, 'seccion' | 'concepto'> = {
  fecha: null,
  total: null,
  retenciones: null,
  anterioresAlInicio: null,
  cargo: null,
  abono: null,
  saldo: null,
};

const nota = (texto: string): FilaExportadaDeEstadoDeCuenta => ({ ...VACIA, seccion: 'Nota', concepto: texto });

const NOMBRE_DE_LA_PRESENTACION = { interna: 'Interna', para_el_proveedor: 'Para el proveedor' };

/** Una línea del estado de cuenta como fila: las anuladas llevan su propia sección y no suman. */
function filaDeLinea({ anulada, ...linea }: LineaDelEstadoDto): FilaExportadaDeEstadoDeCuenta {
  const { fecha, concepto, total, retenciones, anterioresAlInicio, cargo, abono, saldo } = linea;
  const seccion = anulada ? 'Anulada (no suma)' : 'Línea';
  return { seccion, fecha, concepto, total, retenciones, anterioresAlInicio, cargo, abono, saldo };
}

/** Los totales, y en la presentación interna lo comprometido y lo disponible al día final. */
function filasDeTotales({ totales, alCorte }: EstadoDeCuentaDto): FilaExportadaDeEstadoDeCuenta[] {
  const total = { ...VACIA, seccion: 'Total', concepto: 'Totales' };
  const filaTotal = { ...total, cargo: totales.cargos, abono: totales.abonos, saldo: totales.saldoFinal };
  if (!alCorte) return [filaTotal];
  return [
    filaTotal,
    { ...VACIA, seccion: 'Comprometido', concepto: 'Cheques posfechados', saldo: alCorte.comprometido },
    { ...VACIA, seccion: 'Disponible', concepto: 'Disponible para pagar', saldo: alCorte.disponible },
  ];
}

/** R3 en filas planas: saldo anterior, líneas, totales y, al final, el proveedor, el rango y las notas. */
export function aFilasExportadasDeEstadoDeCuenta(reporte: EstadoDeCuentaDto): FilaExportadaDeEstadoDeCuenta[] {
  const { proveedor, desde, hasta, presentacion } = reporte;
  const saldoAnterior = { ...VACIA, seccion: 'Saldo anterior', concepto: 'Saldo anterior' };
  return [
    { ...saldoAnterior, saldo: reporte.totales.saldoAnterior },
    ...reporte.lineas.map(filaDeLinea),
    ...filasDeTotales(reporte),
    nota(`Proveedor: ${proveedor.nombre}${proveedor.nit ? ` (NIT ${proveedor.nit})` : ''}.`),
    nota(
      `Del ${fechaLegible(desde)} al ${fechaLegible(hasta)}. Presentación: ${NOMBRE_DE_LA_PRESENTACION[presentacion]}.`,
    ),
    ...reporte.avisos.map(({ mensaje }) => nota(mensaje)),
    ...reporte.leyendas.map(nota),
  ];
}

const dinero = (clave: string, titulo: string): Columna => ({ clave, titulo, requerido: false, tipo: 'decimal' });

/** Las columnas del Excel de R3: solo se exporta, nunca se importa. */
export const columnasDeEstadoDeCuenta: Columna[] = [
  { clave: 'seccion', titulo: 'Sección', requerido: true, tipo: 'texto' },
  { clave: 'fecha', titulo: 'Fecha', requerido: false, tipo: 'fecha' },
  { clave: 'concepto', titulo: 'Concepto', requerido: true, tipo: 'texto' },
  dinero('total', 'Total'),
  dinero('retenciones', 'Retenciones'),
  dinero('anterioresAlInicio', 'Pagos y notas anteriores a la fecha de inicio'),
  dinero('cargo', 'Cargo'),
  dinero('abono', 'Abono'),
  dinero('saldo', 'Saldo'),
];
