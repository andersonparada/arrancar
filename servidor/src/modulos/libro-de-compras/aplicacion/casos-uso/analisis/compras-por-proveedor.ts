import type { CompraDeProveedor } from '../../../dominio/analisis/filas-del-analisis.js';
import { sumarColumnas } from '../../../dominio/analisis/subtotales.js';
import { dineroEnTexto, quetzales, type ConDineroEnTexto } from '../../dto/analisis.dto.js';
import type { DefinicionDeAnalisis } from './definicion-de-analisis.js';

const DINERO = [
  'total',
  'base',
  'ivaConCredito',
  'ivaSinCredito',
  'exentoYNoAfecto',
  'idp',
  'retenido',
  'neto',
] as const;
const SUMAS = ['documentos', ...DINERO] as const;

export interface ComprasPorProveedor {
  filas: CompraDeProveedor[];
  total: Record<(typeof SUMAS)[number], number>;
}

export interface ComprasPorProveedorDto {
  filas: Array<ConDineroEnTexto<CompraDeProveedor, (typeof DINERO)[number]>>;
  total: ConDineroEnTexto<ComprasPorProveedor['total'], (typeof DINERO)[number]>;
}

const ENCABEZADOS = [
  'NIT',
  'Proveedor',
  'Documentos',
  'Total',
  'Base',
  'IVA con crédito',
  'IVA sin crédito',
  'Exento y no afecto',
  'IDP',
  'Retenido',
  'Neto',
];

const filaDeExcel = (nit: string, nombre: string, f: ComprasPorProveedor['total']): unknown[] => [
  nit,
  nombre,
  f.documentos,
  ...DINERO.map((clave) => quetzales(f[clave])),
];

/** Compras por proveedor: documentos, base, IVA con y sin crédito, exento, IDP, total, retenido y neto. */
export const comprasPorProveedor: DefinicionDeAnalisis<ComprasPorProveedor, ComprasPorProveedorDto> = {
  clave: 'compras-por-proveedor',
  async armar({ consultas, empresaId, rango, incluirFueraDelLibro }) {
    const filas = await consultas.comprasPorProveedor(empresaId, rango, { incluirFueraDelLibro });
    return { filas, total: sumarColumnas(filas, SUMAS) };
  },
  dto: ({ filas, total }) => ({
    filas: filas.map((fila) => dineroEnTexto(fila, DINERO)),
    total: dineroEnTexto(total, DINERO),
  }),
  hoja: ({ filas, total }) => ({
    nombre: 'Compras por proveedor',
    encabezados: ENCABEZADOS,
    filas: [...filas.map((f) => filaDeExcel(f.nit ?? '', f.nombre, f)), filaDeExcel('', 'Total', total)],
  }),
};
