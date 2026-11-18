import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import type {
  CifrasDeBancarizacionDto,
  DocumentoSobreElUmbralDto,
  MesDeBancarizacionDto,
  PagoEnEfectivoDto,
  ReporteDeBancarizacionDto,
} from '../aplicacion/dto/reportes-de-bancarizacion.dto.js';
import { dinero, fecha, seccion, siNo, texto } from './columnas-de-reporte.js';

/** Una fila del Excel de R9: un mes, un pago en efectivo, un documento sobre el umbral, un total o una nota. */
export interface FilaExportadaDeBancarizacion {
  seccion: string;
  mes: string | null;
  proveedor: string | null;
  documento: string | null;
  pago: string | null;
  forma: string | null;
  fecha: string | null;
  retiro: string | null;
  monto: string | null;
  sumaDelMes: string | null;
  sinBancarizar: boolean | null;
  motivo: string | null;
  marcas: string | null;
  ivaEnRiesgo: string | null;
  costoNoDeducible: string | null;
}

const VACIA: FilaExportadaDeBancarizacion = {
  seccion: '',
  mes: null,
  proveedor: null,
  documento: null,
  pago: null,
  forma: null,
  fecha: null,
  retiro: null,
  monto: null,
  sumaDelMes: null,
  sinBancarizar: null,
  motivo: null,
  marcas: null,
  ivaEnRiesgo: null,
  costoNoDeducible: null,
};

const nota = (mensaje: string): FilaExportadaDeBancarizacion => ({ ...VACIA, seccion: 'Nota', proveedor: mensaje });

function filasDelPago(mes: MesDeBancarizacionDto, pago: PagoEnEfectivoDto): FilaExportadaDeBancarizacion[] {
  const base = {
    ...VACIA,
    seccion: 'Pago en efectivo',
    mes: mes.mes,
    proveedor: mes.proveedorNombre,
    pago: pago.recibo,
    fecha: pago.fecha,
    retiro: pago.retiro,
    monto: pago.monto,
    sinBancarizar: pago.sinBancarizar,
    motivo: pago.motivoSinBancarizar,
  };
  if (pago.cargos.length === 0) return [base];
  return pago.cargos.map((cargo) => ({
    ...base,
    documento: cargo.documento,
    marcas: cargo.marcas.join(', '),
    ivaEnRiesgo: cargo.ivaEnRiesgo,
    costoNoDeducible: cargo.costoNoDeducible,
  }));
}

const filasDelMes = (mes: MesDeBancarizacionDto): FilaExportadaDeBancarizacion[] => [
  {
    ...VACIA,
    seccion: 'Mes',
    mes: mes.mes,
    proveedor: mes.proveedorNombre,
    monto: mes.efectivo,
    sumaDelMes: mes.sumaDelMes,
    ivaEnRiesgo: mes.ivaEnRiesgo,
    costoNoDeducible: mes.costoNoDeducible,
  },
  ...mes.pagos.flatMap((pago) => filasDelPago(mes, pago)),
];

const filasDelDocumento = (documento: DocumentoSobreElUmbralDto): FilaExportadaDeBancarizacion[] => [
  {
    ...VACIA,
    seccion: 'Documento sobre el umbral',
    proveedor: documento.proveedorNombre,
    documento: documento.documento,
    monto: documento.total,
    marcas: documento.marcas.join(', '),
    ivaEnRiesgo: documento.ivaEnRiesgo,
    costoNoDeducible: documento.costoNoDeducible,
  },
  ...documento.pagos.map((pago) => ({
    ...VACIA,
    seccion: 'Pago del documento',
    proveedor: documento.proveedorNombre,
    documento: documento.documento,
    pago: pago.numero,
    forma: pago.forma,
    fecha: pago.fecha,
    monto: pago.monto,
  })),
];

function filasDeTotales({ totales }: ReporteDeBancarizacionDto): FilaExportadaDeBancarizacion[] {
  const total = (
    seccionDelTotal: string,
    cifras: Partial<CifrasDeBancarizacionDto> & { ivaEnRiesgo: string; costoNoDeducible: string },
  ) => ({
    ...VACIA,
    seccion: seccionDelTotal,
    monto: cifras.efectivo ?? null,
    ivaEnRiesgo: cifras.ivaEnRiesgo,
    costoNoDeducible: cifras.costoNoDeducible,
  });
  return [
    total('Total meses', totales.meses),
    total('Total documentos', totales.documentos),
    total('Total', totales.total),
  ];
}

/** R9 en filas planas: los meses con sus pagos, los documentos sobre el umbral, los totales y, al final, el rango y las leyendas. */
export function aFilasExportadasDeBancarizacion(reporte: ReporteDeBancarizacionDto): FilaExportadaDeBancarizacion[] {
  return [
    ...reporte.meses.flatMap(filasDelMes),
    ...reporte.documentosSobreElUmbral.flatMap(filasDelDocumento),
    ...filasDeTotales(reporte),
    nota(`Pagos en efectivo sobre el umbral de bancarización de ${reporte.desde} a ${reporte.hasta}.`),
    ...reporte.leyendas.map(nota),
  ];
}

/** Las columnas del Excel de R9: solo se exporta, nunca se importa. */
export const columnasDeBancarizacion: Columna[] = [
  seccion,
  texto('mes', 'Mes'),
  { clave: 'proveedor', titulo: 'Proveedor', requerido: true, tipo: 'texto' },
  texto('documento', 'Documento'),
  texto('pago', 'Recibo o pago'),
  texto('forma', 'Forma'),
  fecha('fecha', 'Fecha'),
  texto('retiro', 'Retiro'),
  dinero('monto', 'Monto'),
  dinero('sumaDelMes', 'Suma del mes'),
  siNo('sinBancarizar', 'Con la excepción'),
  texto('motivo', 'Motivo de la excepción'),
  texto('marcas', 'Marcas'),
  dinero('ivaEnRiesgo', 'IVA en riesgo'),
  dinero('costoNoDeducible', 'Costo no deducible'),
];
