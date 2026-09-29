import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type { FiltroDeMovimientos } from './movimientos.api';

/** En qué se apoya una sugerencia: los movimientos del mismo beneficiario, uno parecido o la misma cuenta sin beneficiario. */
export type BaseDeSugerencia = 'mismo_beneficiario' | 'beneficiario_parecido' | 'misma_cuenta_sin_beneficiario';

/** El «por qué» de una opción: cuántos casos votaron por ella, su rango de montos y el más reciente. */
export interface PorqueDeSugerencia {
  base: BaseDeSugerencia;
  casos: number;
  ultimaFecha: string;
  montoMinimo: string;
  montoMaximo: string;
  beneficiarioParecido: string | null;
}

/** Un concepto propuesto; `confianza` es un entero de 0 a 100 (no es una probabilidad calibrada). */
export interface OpcionSugerida {
  conceptoId: string;
  conceptoNombre: string;
  confianza: number;
  porque: PorqueDeSugerencia;
}

/** Lo que el servidor propone para un movimiento (`movimientoId` solo viene en la bandeja). */
export interface SugerenciaDeMovimiento {
  movimientoId?: string;
  sugerido: OpcionSugerida | null;
  alternativas: OpcionSugerida[];
  /** Cuántos casos comparó en total (de todos los conceptos). */
  casosComparados: number;
}

export interface RespuestaDeSugerencias {
  confianzaMinima: number;
  vidaMediaDias: number;
  /** Había más pendientes de los que se calculan (2,000): conviene acotar las fechas. */
  truncado: boolean;
  sugerencias: SugerenciaDeMovimiento[];
}

/** Lo que se sabe de un movimiento mientras se captura: solo la cuenta es obligatoria. */
export interface DatosParaSugerir {
  cuentaBancariaId: string;
  fecha?: string;
  monto?: string;
  beneficiario?: string;
  referencia?: string;
  observaciones?: string;
}

/** Sugerencias de concepto: para la bandeja «Sin clasificar» y al capturar una nota o un cheque. Solo lectura. */
export class ApiSugerencias {
  constructor(private readonly http: ClienteHttp) {}

  /** Las de todo lo pendiente del filtro (cuenta y fechas); pide `bancos.notas.editar`. */
  deLosPendientes(filtro: FiltroDeMovimientos) {
    return this.http.obtener<RespuestaDeSugerencias>('/bancos/notas/sugerencias-de-concepto', filtro);
  }

  /** Al escribir una nota (pide `bancos.notas.crear`); `POST` para no dejar el beneficiario en las URL. */
  paraNota(datos: DatosParaSugerir & { tipo: 'credito' | 'debito' }) {
    return this.http.crear<SugerenciaDeMovimiento>('/bancos/notas/sugerir-concepto', datos);
  }

  /** Al emitir un cheque (pide `bancos.cheques.emitir`). */
  paraCheque(datos: DatosParaSugerir) {
    return this.http.crear<SugerenciaDeMovimiento>('/bancos/cheques/sugerir-concepto', datos);
  }
}

export const apiSugerencias = new ApiSugerencias(clienteHttp);
