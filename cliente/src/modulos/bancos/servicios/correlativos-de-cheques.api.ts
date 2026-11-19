import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';

/** Cómo sale cada número en el reporte: `inutilizado` es un anulado que pasó su pago a otro formulario. */
export type EstadoDelNumero = 'disponible' | 'emitido' | 'anulado' | 'inutilizado' | 'sin_registro';

export type CausaDelAnulado = 'manual' | 'caducidad' | 'extraviado';

/** Un número de la chequera. */
export interface NumeroDeCheque {
  numero: number;
  estado: EstadoDelNumero;
  /** Solo en un anulado (no inutilizado). */
  causa: CausaDelAnulado | null;
  fecha: string | null;
  beneficiario: string | null;
  monto: string | null;
  impreso: boolean;
  impresoEn: string | null;
  motivoDeAnulacion: string | null;
  /** Solo en un inutilizado: el número al que pasó su pago. */
  pasoAlNumero: number | null;
}

export interface ResumenDeCorrelativosDeCheques {
  emitidos: number;
  anulados: { total: number; manual: number; caducidad: number; extraviado: number };
  inutilizados: number;
  disponibles: number;
  totalDelRango: number;
  /** Si la suma no da el total: un número sin fila. `null` si cuadra. */
  alerta: string | null;
}

/** El reporte de correlativos de una chequera: todos sus números, su resumen y el cuadro del conteo del papel. */
export interface ReporteDeCorrelativosDeCheques {
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
  cheques: NumeroDeCheque[];
  conteoFisico: { disponiblesSegunElSistema: number; nota: string };
}

const rutaDe = (chequeraId: string) => `/bancos/chequeras/${chequeraId}/correlativos`;

/** Correlativos de cheques es de solo lectura (Reportes): el reporte de una chequera y su Excel. */
export class ApiCorrelativosDeCheques {
  constructor(private readonly http: ClienteHttp) {}

  /** Solo exportar (es reporte), con el mismo filtro que la pantalla. */
  intercambioDe(chequeraId: string) {
    return intercambioDe(this.http, rutaDe(chequeraId));
  }

  reporte(chequeraId: string, estado?: EstadoDelNumero) {
    return this.http.obtener<ReporteDeCorrelativosDeCheques>(rutaDe(chequeraId), estado ? { estado } : undefined);
  }
}

export const apiCorrelativosDeCheques = new ApiCorrelativosDeCheques(clienteHttp);
