import type { CompraDeConcepto } from '../../../dominio/analisis/filas-del-analisis.js';
import { sumarColumnas } from '../../../dominio/analisis/subtotales.js';
import { dineroEnTexto, quetzales, type ConDineroEnTexto } from '../../dto/analisis.dto.js';
import type { DefinicionDeAnalisis } from './definicion-de-analisis.js';

const DINERO = ['base', 'ivaConCredito', 'ivaAlCosto', 'costo'] as const;
const SUMAS = ['lineas', ...DINERO] as const;

export interface ComprasPorConcepto {
  filas: CompraDeConcepto[];
  total: Record<(typeof SUMAS)[number], number>;
}

export interface ComprasPorConceptoDto {
  filas: Array<ConDineroEnTexto<CompraDeConcepto, (typeof DINERO)[number]>>;
  total: ConDineroEnTexto<ComprasPorConcepto['total'], (typeof DINERO)[number]>;
}

const TIPOS = { bien: 'Bien', servicio: 'Servicio' } as const;

const filaDeExcel = (concepto: string, tipo: string, f: ComprasPorConcepto['total']): unknown[] => [
  concepto,
  tipo,
  f.lineas,
  ...DINERO.map((clave) => quetzales(f[clave])),
];

/** Compras por concepto de gasto: el costo de cada línea es `total − iva + iva_no_acreditable`. */
export const comprasPorConcepto: DefinicionDeAnalisis<ComprasPorConcepto, ComprasPorConceptoDto> = {
  clave: 'compras-por-concepto',
  async armar({ consultas, empresaId, rango }) {
    const filas = await consultas.comprasPorConcepto(empresaId, rango);
    return { filas, total: sumarColumnas(filas, SUMAS) };
  },
  dto: ({ filas, total }) => ({
    filas: filas.map((fila) => dineroEnTexto(fila, DINERO)),
    total: dineroEnTexto(total, DINERO),
  }),
  hoja: ({ filas, total }) => ({
    nombre: 'Compras por concepto',
    encabezados: ['Concepto', 'Tipo', 'Líneas', 'Base', 'IVA con crédito', 'IVA al costo', 'Costo'],
    filas: [...filas.map((f) => filaDeExcel(f.concepto, TIPOS[f.tipo], f)), filaDeExcel('Total', '', total)],
  }),
};
