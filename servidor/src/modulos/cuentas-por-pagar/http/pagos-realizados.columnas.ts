import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import type { ReporteDePagosRealizadosDto } from '../aplicacion/dto/reportes-de-pagos.dto.js';
import type { LineaDePagoRealizado } from '../aplicacion/puertos/puertos-de-reportes-de-pagos.js';
import { fechaLegible } from '../dominio/avisos.js';
import { NOMBRES_DE_FORMAS } from '../dominio/nombres-de-formas.js';
import { dinero, fecha, seccion, siNo, texto } from './columnas-de-reporte.js';

/** Una fila del Excel de R6: una línea de pago, un total o una nota (rango y leyendas). */
export interface FilaExportadaDePagos {
  seccion: string;
  pago: string | null;
  fecha: string | null;
  forma: string | null;
  documentoBancario: string | null;
  cuenta: string | null;
  proveedor: string | null;
  contrasena: string | null;
  documento: string | null;
  monto: string | null;
  retencion: string | null;
  cubre: string | null;
  registroElDocumento: string | null;
  completoElDocumento: string | null;
  autorizoElDocumento: string | null;
  registroElPago: string | null;
  misma: boolean | null;
  estado: string | null;
  fechaDeAnulacion: string | null;
  motivoDeAnulacion: string | null;
}

const VACIA: FilaExportadaDePagos = {
  seccion: '',
  pago: null,
  fecha: null,
  forma: null,
  documentoBancario: null,
  cuenta: null,
  proveedor: null,
  contrasena: null,
  documento: null,
  monto: null,
  retencion: null,
  cubre: null,
  registroElDocumento: null,
  completoElDocumento: null,
  autorizoElDocumento: null,
  registroElPago: null,
  misma: null,
  estado: null,
  fechaDeAnulacion: null,
  motivoDeAnulacion: null,
};

const nota = (mensaje: string): FilaExportadaDePagos => ({ ...VACIA, seccion: 'Nota', proveedor: mensaje });

function filaDeLinea(linea: LineaDePagoRealizado): FilaExportadaDePagos {
  return {
    ...VACIA,
    ...linea,
    forma: NOMBRES_DE_FORMAS[linea.forma],
    seccion: 'Pagos',
    pago: linea.numeroDelPago,
    proveedor: linea.proveedorNombre,
    documento: linea.numeroDelDocumento,
    retencion: linea.retencionDescontada,
  };
}

/** Los totales por forma y estado, y los de vigentes y anulados. */
function filasDeTotales({ totales }: ReporteDePagosRealizadosDto): FilaExportadaDePagos[] {
  const porForma = totales.porForma.map((total) => ({
    ...VACIA,
    seccion: `Total ${total.estado === 'vigente' ? 'vigentes' : 'anulados'}`,
    forma: NOMBRES_DE_FORMAS[total.forma],
    monto: total.monto,
    retencion: total.retencion,
    cubre: total.cubre,
  }));
  const general = (titulo: string, suma: typeof totales.vigentes): FilaExportadaDePagos => ({
    ...VACIA,
    seccion: titulo,
    monto: suma.monto,
    retencion: suma.retencionDescontada,
    cubre: suma.cubre,
  });
  return [...porForma, general('Total vigentes', totales.vigentes), general('Total anulados', totales.anulados)];
}

/** R6 en filas planas: las líneas, los totales y, al final, el rango y las leyendas. */
export function aFilasExportadasDePagos(reporte: ReporteDePagosRealizadosDto): FilaExportadaDePagos[] {
  return [
    ...reporte.filas.map(filaDeLinea),
    ...filasDeTotales(reporte),
    nota(`Pagos del ${fechaLegible(reporte.desde)} al ${fechaLegible(reporte.hasta)}.`),
    ...reporte.leyendas.map(nota),
  ];
}

/** Las columnas del Excel de R6: solo se exporta, nunca se importa. */
export const columnasDePagosRealizados: Columna[] = [
  seccion,
  texto('pago', 'Pago'),
  fecha('fecha', 'Fecha'),
  texto('forma', 'Forma'),
  texto('documentoBancario', 'Cheque, nota o recibo'),
  texto('cuenta', 'Cuenta'),
  { clave: 'proveedor', titulo: 'Proveedor', requerido: true, tipo: 'texto' },
  texto('contrasena', 'Contraseña'),
  texto('documento', 'Documento pagado'),
  dinero('monto', 'Monto'),
  dinero('retencion', 'Retención descontada'),
  dinero('cubre', 'Cubre'),
  texto('registroElDocumento', 'Registró el documento'),
  texto('completoElDocumento', 'Completó el documento'),
  texto('autorizoElDocumento', 'Autorizó el documento'),
  texto('registroElPago', 'Registró el pago'),
  siNo('misma', 'Misma persona'),
  texto('estado', 'Estado'),
  fecha('fechaDeAnulacion', 'Fecha de anulación'),
  texto('motivoDeAnulacion', 'Motivo de anulación'),
];
