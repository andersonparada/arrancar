/** Cómo sale cada número en el reporte: `inutilizado` es un anulado que pasó su pago a otro formulario; `sin_registro` es un número del rango sin fila. */
export type EstadoDelNumero = 'disponible' | 'emitido' | 'anulado' | 'inutilizado' | 'sin_registro';

export type CausaDelAnulado = 'manual' | 'caducidad' | 'extraviado';

/** Un número de la chequera. */
export interface NumeroDeChequeDto {
  numero: number;
  estado: EstadoDelNumero;
  /** Solo en un anulado (no inutilizado). */
  causa: CausaDelAnulado | null;
  /** Del movimiento, si tiene; si no, `null`. */
  fecha: string | null;
  beneficiario: string | null;
  monto: string | null;
  impreso: boolean;
  impresoEn: string | null;
  motivoDeAnulacion: string | null;
  /** Solo en un inutilizado: el número al que pasó su pago (lo dice la auditoría). */
  pasoAlNumero: number | null;
}

export interface ResumenDeCorrelativosDeCheques {
  emitidos: number;
  /** Los anulados por otra causa que no sea inutilizar: `manual`, `caducidad` y `extraviado`. */
  anulados: { total: number; manual: number; caducidad: number; extraviado: number };
  inutilizados: number;
  disponibles: number;
  /** `hasta - desde + 1`; en una chequera de la carga inicial, los números que tiene (su rango tiene huecos por diseño). */
  totalDelRango: number;
  /** Si la suma no da el total: un número sin fila. `null` si cuadra. */
  alerta: string | null;
}

/** El reporte de correlativos de una chequera: todos sus números, su resumen y el cuadro del conteo del papel. */
export interface ReporteDeCorrelativosDeChequesDto {
  chequera: {
    id: string;
    serie: string | null;
    desde: number;
    hasta: number;
    activa: boolean;
    deApertura: boolean;
    /** «De la carga inicial» en la chequera de apertura. */
    etiqueta: string | null;
  };
  cuenta: { id: string; nombre: string; numero: string; banco: string };
  resumen: ResumenDeCorrelativosDeCheques;
  cheques: NumeroDeChequeDto[];
  /** El conteo físico del papel en blanco se hace por alguien distinto de quien emite; el sistema no lo guarda. */
  conteoFisico: { disponiblesSegunElSistema: number; nota: string };
}

/** Lo que se pide: la chequera y, opcionalmente, solo los números en un estado (el resumen siempre sale completo). */
export interface FiltroDeCorrelativosDeCheques {
  chequeraId: string;
  estado?: EstadoDelNumero;
}
