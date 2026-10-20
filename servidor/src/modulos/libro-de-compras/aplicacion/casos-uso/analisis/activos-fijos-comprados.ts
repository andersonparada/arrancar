import type { ActivoFijoComprado } from '../../../dominio/analisis/filas-del-analisis.js';
import { sumarColumnas } from '../../../dominio/analisis/subtotales.js';
import { dineroEnTexto, quetzales, type ConDineroEnTexto } from '../../dto/analisis.dto.js';
import type { DefinicionDeAnalisis } from './definicion-de-analisis.js';
import { numeroDelDocumento } from './numero-del-documento.js';

const DINERO = ['costo', 'ivaConCredito'] as const;

export interface ActivosFijosComprados {
  filas: ActivoFijoComprado[];
  total: Record<(typeof DINERO)[number], number>;
}

export interface ActivosFijosCompradosDto {
  filas: Array<ConDineroEnTexto<ActivoFijoComprado, (typeof DINERO)[number]>>;
  total: ConDineroEnTexto<ActivosFijosComprados['total'], (typeof DINERO)[number]>;
}

const filaDeExcel = (f: ActivoFijoComprado): unknown[] => [
  f.fecha,
  f.nitDelProveedor ?? '',
  f.proveedor,
  numeroDelDocumento(f),
  f.concepto,
  f.descripcion ?? '',
  quetzales(f.costo),
  quetzales(f.ivaConCredito),
];

/** Activos fijos comprados: el costo incluye el IVA no acreditable; el crédito es el IVA que sí se acredita. */
export const activosFijosComprados: DefinicionDeAnalisis<ActivosFijosComprados, ActivosFijosCompradosDto> = {
  clave: 'activos-fijos',
  async armar({ consultas, empresaId, rango }) {
    const filas = await consultas.activosFijos(empresaId, rango);
    return { filas, total: sumarColumnas(filas, DINERO) };
  },
  dto: ({ filas, total }) => ({
    filas: filas.map((fila) => dineroEnTexto(fila, DINERO)),
    total: dineroEnTexto(total, DINERO),
  }),
  hoja: ({ filas, total }) => ({
    nombre: 'Activos fijos',
    encabezados: ['Fecha', 'NIT', 'Proveedor', 'Documento', 'Concepto', 'Descripción', 'Costo', 'IVA con crédito'],
    filas: [
      ...filas.map(filaDeExcel),
      ['Total', '', '', '', '', '', quetzales(total.costo), quetzales(total.ivaConCredito)],
    ],
  }),
};
