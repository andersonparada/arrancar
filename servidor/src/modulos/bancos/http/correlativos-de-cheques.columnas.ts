import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import type {
  NumeroDeChequeDto,
  ReporteDeCorrelativosDeChequesDto,
} from '../aplicacion/dto/correlativos-de-cheques.dto.js';

/** Una fila del Excel: un número de la chequera, o una línea del resumen al final. */
export interface FilaExportadaDeCorrelativoDeCheque {
  numero: number | null;
  estado: string;
  causa: string | null;
  fecha: string | null;
  beneficiario: string | null;
  monto: string | null;
  impreso: boolean | null;
  impresoEn: string | null;
  motivoDeAnulacion: string | null;
  pasoAlNumero: number | null;
}

const TEXTO_DEL_ESTADO = {
  disponible: 'Disponible',
  emitido: 'Emitido',
  anulado: 'Anulado',
  inutilizado: 'Inutilizado',
  sin_registro: 'Alerta: sin registro',
} as const;
const TEXTO_DE_LA_CAUSA = { manual: 'Manual', caducidad: 'Caducidad', extraviado: 'Extraviado' } as const;

const filaDeResumen = (concepto: string, cantidad: number): FilaExportadaDeCorrelativoDeCheque => ({
  numero: cantidad,
  estado: 'Resumen',
  causa: concepto,
  fecha: null,
  beneficiario: null,
  monto: null,
  impreso: null,
  impresoEn: null,
  motivoDeAnulacion: null,
  pasoAlNumero: null,
});

const filaDeNumero = (cheque: NumeroDeChequeDto): FilaExportadaDeCorrelativoDeCheque => ({
  numero: cheque.numero,
  estado: TEXTO_DEL_ESTADO[cheque.estado],
  causa: cheque.causa ? TEXTO_DE_LA_CAUSA[cheque.causa] : null,
  fecha: cheque.fecha,
  beneficiario: cheque.beneficiario,
  monto: cheque.monto,
  impreso: ['disponible', 'sin_registro'].includes(cheque.estado) ? null : cheque.impreso,
  impresoEn: cheque.impresoEn ? cheque.impresoEn.slice(0, 10) : null,
  motivoDeAnulacion: cheque.motivoDeAnulacion,
  pasoAlNumero: cheque.pasoAlNumero,
});

/** El resumen en líneas al final del Excel; la última lleva la alerta si un número no tiene fila. */
function filasDelResumen({ resumen }: ReporteDeCorrelativosDeChequesDto): FilaExportadaDeCorrelativoDeCheque[] {
  const alerta = resumen.alerta ? [{ ...filaDeResumen(resumen.alerta, 0), numero: null }] : [];
  return [
    filaDeResumen('Emitidos', resumen.emitidos),
    filaDeResumen('Anulados a mano', resumen.anulados.manual),
    filaDeResumen('Anulados por caducidad', resumen.anulados.caducidad),
    filaDeResumen('Anulados como extraviados', resumen.anulados.extraviado),
    filaDeResumen('Inutilizados', resumen.inutilizados),
    filaDeResumen('Disponibles', resumen.disponibles),
    filaDeResumen('Total del rango', resumen.totalDelRango),
    ...alerta,
  ];
}

/** Los números de la chequera y, al final, su resumen. */
export const aFilasExportadasDeCorrelativosDeCheques = (
  reporte: ReporteDeCorrelativosDeChequesDto,
): FilaExportadaDeCorrelativoDeCheque[] => [...reporte.cheques.map(filaDeNumero), ...filasDelResumen(reporte)];

/** Las columnas del Excel de correlativos de cheques: solo se exporta, nunca se importa. */
export const columnasDeCorrelativosDeCheques: Columna[] = [
  { clave: 'numero', titulo: 'Número', requerido: true, tipo: 'entero' },
  { clave: 'estado', titulo: 'Estado', requerido: true, tipo: 'texto' },
  { clave: 'causa', titulo: 'Causa', requerido: false, tipo: 'texto' },
  { clave: 'fecha', titulo: 'Fecha', requerido: false, tipo: 'fecha' },
  { clave: 'beneficiario', titulo: 'Beneficiario', requerido: false, tipo: 'texto' },
  { clave: 'monto', titulo: 'Monto', requerido: false, tipo: 'decimal' },
  { clave: 'impreso', titulo: 'Impreso', requerido: false, tipo: 'siNo' },
  { clave: 'impresoEn', titulo: 'Fecha de impresión', requerido: false, tipo: 'fecha' },
  { clave: 'motivoDeAnulacion', titulo: 'Motivo de anulación', requerido: false, tipo: 'texto' },
  { clave: 'pasoAlNumero', titulo: 'Pasó al número', requerido: false, tipo: 'entero' },
];
