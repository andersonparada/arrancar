import type { IvaAlCostoDeLinea } from '../../../dominio/analisis/filas-del-analisis.js';
import { agruparConSubtotal, sumarColumnas } from '../../../dominio/analisis/subtotales.js';
import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { quetzales } from '../../dto/analisis.dto.js';
import type { DefinicionDeAnalisis } from './definicion-de-analisis.js';
import { numeroDelDocumento } from './numero-del-documento.js';

export interface GrupoDeMotivo {
  motivo: string | null;
  lineas: IvaAlCostoDeLinea[];
  subtotal: number;
}

export interface IvaAlCostoPorMotivo {
  motivos: GrupoDeMotivo[];
  total: number;
}

export interface IvaAlCostoPorMotivoDto {
  motivos: Array<{
    motivo: string | null;
    lineas: Array<Omit<IvaAlCostoDeLinea, 'ivaAlCosto'> & { ivaAlCosto: string }>;
    subtotal: string;
  }>;
  total: string;
}

const NOMBRE_DEL_MOTIVO: Record<string, string> = {
  fuera_de_plazo: 'Fuera de plazo',
  no_vinculado: 'No vinculado a operaciones gravadas',
  empresa_sin_credito: 'Empresa sin crédito',
  nota_de_debito_tardia: 'Nota de débito tardía',
};

const nombreDelMotivo = (motivo: string | null): string =>
  motivo ? (NOMBRE_DEL_MOTIVO[motivo] ?? motivo) : 'Sin motivo';

const filaDeExcel = (motivo: string | null, l: IvaAlCostoDeLinea): unknown[] => [
  nombreDelMotivo(motivo),
  l.periodo.slice(0, 7),
  l.fecha,
  numeroDelDocumento(l),
  l.nitDelProveedor ?? '',
  l.proveedor,
  l.numeroDeLinea,
  l.concepto,
  quetzales(l.ivaAlCosto),
];

const subtotalDeExcel = (motivo: string | null, subtotal: number): unknown[] => [
  `Subtotal: ${nombreDelMotivo(motivo)}`,
  ...Array<string>(7).fill(''),
  quetzales(subtotal),
];

/** IVA al costo por motivo, con su documento y su línea; el subtotal de cada motivo y el total. */
export const ivaAlCostoPorMotivo: DefinicionDeAnalisis<IvaAlCostoPorMotivo, IvaAlCostoPorMotivoDto> = {
  clave: 'iva-al-costo',
  async armar({ consultas, empresaId, rango }) {
    const lineas = await consultas.ivaAlCosto(empresaId, rango);
    const grupos = agruparConSubtotal(lineas, { clave: (l) => l.motivo, sumar: ['ivaAlCosto'] });
    return {
      motivos: grupos.map((g) => ({ motivo: g.clave, lineas: g.filas, subtotal: g.subtotal.ivaAlCosto })),
      total: sumarColumnas(lineas, ['ivaAlCosto']).ivaAlCosto,
    };
  },
  dto: ({ motivos, total }) => ({
    motivos: motivos.map((m) => ({
      motivo: m.motivo,
      lineas: m.lineas.map((l) => ({ ...l, ivaAlCosto: deCentavos(l.ivaAlCosto) })),
      subtotal: deCentavos(m.subtotal),
    })),
    total: deCentavos(total),
  }),
  hoja: ({ motivos, total }) => ({
    nombre: 'IVA al costo',
    encabezados: ['Motivo', 'Período', 'Fecha', 'Documento', 'NIT', 'Proveedor', 'Línea', 'Concepto', 'IVA al costo'],
    filas: [
      ...motivos.flatMap((m) => [
        ...m.lineas.map((l) => filaDeExcel(m.motivo, l)),
        subtotalDeExcel(m.motivo, m.subtotal),
      ]),
      ['Total', ...Array<string>(7).fill(''), quetzales(total)],
    ],
  }),
};
