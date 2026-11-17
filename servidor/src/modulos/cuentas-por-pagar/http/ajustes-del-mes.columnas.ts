import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import type {
  FilaDeAjusteDelMesDto,
  FilaDeAplicacionManualDto,
  FilaDeDocumentoRevertidoDto,
  FilaDePagoAAperturaDto,
  ReporteDeAjustesDelMesDto,
} from '../aplicacion/dto/reportes-de-control.dto.js';
import { MARCA_DE_MES_ANTERIOR } from '../aplicacion/dto/dto-de-reportes-de-control.js';
import { dinero, fecha, seccion, texto } from './columnas-de-reporte.js';

/** Una fila del Excel de R8: las cinco secciones comparten columnas; cada una llena las suyas. */
export interface FilaExportadaDeAjustes {
  seccion: string;
  fecha: string | null;
  documento: string | null;
  proveedor: string | null;
  causa: string | null;
  efecto: string | null;
  monto: string | null;
  referencia: string | null;
  motivo: string | null;
  pago: string | null;
  registro: string | null;
  estado: string | null;
  anuladoPor: string | null;
  anuladoEn: string | null;
  motivoDeAnulacion: string | null;
  aviso: string | null;
}

const VACIA: FilaExportadaDeAjustes = {
  seccion: '',
  fecha: null,
  documento: null,
  proveedor: null,
  causa: null,
  efecto: null,
  monto: null,
  referencia: null,
  motivo: null,
  pago: null,
  registro: null,
  estado: null,
  anuladoPor: null,
  anuladoEn: null,
  motivoDeAnulacion: null,
  aviso: null,
};

const nota = (mensaje: string): FilaExportadaDeAjustes => ({ ...VACIA, seccion: 'Nota', proveedor: mensaje });

const filaDeAjuste = (titulo: string, ajuste: FilaDeAjusteDelMesDto): FilaExportadaDeAjustes => ({
  ...VACIA,
  ...ajuste,
  seccion: titulo,
  proveedor: ajuste.proveedorNombre,
  aviso: ajuste.anioAnterior ? 'Año anterior' : null,
});

const filaDeManual = (fila: FilaDeAplicacionManualDto): FilaExportadaDeAjustes => ({
  ...VACIA,
  ...fila,
  seccion: 'Aplicaciones manuales',
  documento: `${fila.nota} aplicada a ${fila.cargo}`,
  proveedor: fila.proveedorNombre,
});

const filaDeApertura = (fila: FilaDePagoAAperturaDto): FilaExportadaDeAjustes => ({
  ...VACIA,
  ...fila,
  seccion: 'Pagos a la cuenta de apertura',
  documento: fila.numeroDelPago,
  proveedor: fila.proveedorNombre,
  aviso: fila.conCargaCerrada ? 'Con la carga inicial cerrada' : 'Con la carga inicial abierta',
});

const filaDeRevertido = (fila: FilaDeDocumentoRevertidoDto): FilaExportadaDeAjustes => ({
  ...VACIA,
  seccion: fila.tipoDeBaja === 'anulado' ? 'Documentos anulados' : 'Documentos desautorizados',
  fecha: fila.cuando.slice(0, 10),
  documento: fila.documento,
  proveedor: fila.proveedorNombre,
  monto: fila.total,
  motivo: fila.motivo,
  registro: fila.quien,
  estado: fila.estabaAutorizado ? 'Estaba autorizado' : 'No estaba autorizado',
  aviso: fila.marca,
});

/** R8 en filas planas, sección por sección, y al final el mes y las leyendas. */
export function aFilasExportadasDeAjustes(reporte: ReporteDeAjustesDelMesDto): FilaExportadaDeAjustes[] {
  return [
    ...reporte.ajustes.map((a) => filaDeAjuste('Ajustes del mes', a)),
    ...reporte.anulacionesDeOtrosMeses.map((a) => filaDeAjuste('Anulaciones de ajustes de otros meses', a)),
    ...reporte.aplicacionesManuales.map(filaDeManual),
    ...reporte.pagosAApertura.map(filaDeApertura),
    ...reporte.documentosAnulados.map(filaDeRevertido),
    ...reporte.documentosDesautorizados.map(filaDeRevertido),
    ...reporte.totales.porCausa.map((total) => ({
      ...VACIA,
      seccion: 'Total por causa y efecto',
      causa: total.causa,
      efecto: total.efecto,
      monto: total.monto,
    })),
    nota(`Ajustes y cambios del mes ${reporte.mes}.`),
    nota(MARCA_DE_MES_ANTERIOR),
    ...reporte.leyendas.map(nota),
  ];
}

/** Las columnas del Excel de R8: solo se exporta, nunca se importa. */
export const columnasDeAjustesDelMes: Columna[] = [
  seccion,
  fecha('fecha', 'Fecha'),
  texto('documento', 'Documento'),
  { clave: 'proveedor', titulo: 'Proveedor', requerido: true, tipo: 'texto' },
  texto('causa', 'Causa'),
  texto('efecto', 'Efecto'),
  dinero('monto', 'Monto'),
  texto('referencia', 'Referencia'),
  texto('motivo', 'Motivo'),
  texto('pago', 'Pago'),
  texto('registro', 'Registró'),
  texto('estado', 'Estado'),
  texto('anuladoPor', 'Anuló'),
  texto('anuladoEn', 'Anulado el'),
  texto('motivoDeAnulacion', 'Motivo de anulación'),
  texto('aviso', 'Aviso'),
];
