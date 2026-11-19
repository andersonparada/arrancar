import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type { AvisoDeBancos } from '../composables/movimientos/avisos-de-bancos';
import type { DatosDeBaja } from './datos-de-baja';
import type { ParteDeApertura } from './tipos-de-saldos-iniciales';
import type { Movimiento } from './movimientos.api';
import type { DatosDeReclasificacion, ResultadoDeReclasificacion } from './notas.api';

/** Por qué se anuló un cheque (nulo si no está anulado). */
export type CausaDeAnulacion = 'manual' | 'caducidad' | 'inutilizado' | 'extraviado';

export type EstadoDelCheque = 'disponible' | 'emitido' | 'anulado';

/** Cheque tal como lo manda el servidor. */
export interface Cheque {
  id: string;
  chequeraId: string;
  numero: number;
  estado: EstadoDelCheque;
  noNegociable: boolean;
  /** «PARA ABONO EN CUENTA» (art. 521). */
  paraAbonoEnCuenta: boolean;
  movimientoId: string | null;
  anuladoEn: string | null;
  motivoDeAnulacion: string | null;
  causaDeAnulacion: CausaDeAnulacion | null;
  /** Un aviso fijo según por qué se anuló (extraviado: avisar al banco por escrito); `null` si no lleva. */
  aviso: string | null;
  /** Cuándo se imprimió por primera vez; `null` si no se ha impreso. */
  impresoEn: string | null;
  /** El módulo que generó el cheque (`cuentas-por-pagar`…); `null` si nació en Bancos. */
  moduloDeOrigen: string | null;
  /** La parte de la carga inicial que es (cheque en circulación o posfechado); `null` si se emitió en Arrancar. */
  parteDeApertura: ParteDeApertura | null;
  /** Lo calcula el servidor: si se puede anular. */
  puedeAnular: boolean;
  /** Lo calcula el servidor: si se puede blanquear (emitido, con su movimiento limpio). */
  puedeBlanquear: boolean;
  /** Lo calcula el servidor: si se puede imprimir por primera vez. */
  puedeImprimir: boolean;
  /** Lo calcula el servidor: si ya se imprimió y se puede reimprimir. */
  puedeReimprimir: boolean;
  /** Lo calcula el servidor: si se puede pasar su pago a otro formulario (impreso, con el movimiento limpio). */
  puedePasarAOtroFormulario: boolean;
  /** Lo calcula el servidor: si se puede anular como extraviado (impreso, aunque su mes ya esté conciliado). */
  puedeDeclararExtraviado: boolean;
}

export interface DatosDeEmisionDeCheque {
  fecha: string;
  monto: string;
  beneficiario: string;
  noNegociable: boolean;
  /** «PARA ABONO EN CUENTA» (art. 521): apagado por omisión. */
  paraAbonoEnCuenta: boolean;
  /** El concepto que clasifica el pago (un cheque cuenta como débito). */
  conceptoId: string;
  referencia: string | null;
  observaciones: string | null;
}

/** Un cheque emitido o anulado en la lista de la empresa, con los datos de su movimiento si llegó a emitirse. */
export interface ChequeListado {
  id: string;
  /** Un lote de impresión es de una sola chequera. */
  chequeraId: string;
  numero: number;
  serie: string | null;
  cuentaBancariaId: string;
  cuentaBancariaNombre: string;
  estado: 'emitido' | 'anulado';
  noNegociable: boolean;
  paraAbonoEnCuenta: boolean;
  fecha: string;
  monto: string | null;
  beneficiario: string | null;
  referencia: string | null;
  anuladoEn: string | null;
  motivoDeAnulacion: string | null;
  causaDeAnulacion: CausaDeAnulacion | null;
  aviso: string | null;
  impresoEn: string | null;
  /** El módulo que generó el cheque (`cuentas-por-pagar`…); `null` si nació en Bancos. */
  moduloDeOrigen: string | null;
  /** La parte de la carga inicial que es; `null` si se emitió en Arrancar. */
  parteDeApertura: ParteDeApertura | null;
  puedeAnular: boolean;
  puedeBlanquear: boolean;
  /** Lo calcula el servidor: si se puede imprimir por primera vez. */
  puedeImprimir: boolean;
  /** Lo calcula el servidor: si ya se imprimió y se puede reimprimir. */
  puedeReimprimir: boolean;
  /** Lo calcula el servidor: si se puede pasar su pago a otro formulario (impreso, con el movimiento limpio). */
  puedePasarAOtroFormulario: boolean;
  /** Lo calcula el servidor: si se puede anular como extraviado (impreso, aunque su mes ya esté conciliado). */
  puedeDeclararExtraviado: boolean;
}

export interface FiltroDeChequesDeLaEmpresa {
  cuentaBancariaId?: string | null;
  estado?: 'emitido' | 'anulado' | null;
  desde?: string;
  hasta?: string;
}

/** Lo que se manda al pasar el pago a otro formulario: las dos confirmaciones del que lo inutiliza. */
export interface DatosDeCambioDeFormulario {
  chequeDestinoId: string;
  motivo: string;
  enCustodia: boolean;
  papelConservado: boolean;
}

/** El resultado de pasar el pago a otro formulario: el cheque inutilizado, el que recibió el pago y los avisos. */
export interface ChequePasado {
  inutilizado: Cheque;
  destino: Cheque;
  avisos: string[];
}

/** Ver, emitir, anular y blanquear cheques (nunca se eliminan): la lista es operación (los emitidos y anulados); sin Excel. */
export class ApiCheques {
  constructor(private readonly http: ClienteHttp) {}

  /** Los cheques emitidos y anulados de la empresa; los disponibles se ven en su chequera. */
  listar(filtro: FiltroDeChequesDeLaEmpresa) {
    const { cuentaBancariaId, estado, desde, hasta } = filtro;
    return this.http.obtener<ChequeListado[]>('/bancos/cheques', {
      ...(cuentaBancariaId ? { cuentaBancariaId } : {}),
      ...(estado ? { estado } : {}),
      ...(desde ? { desde } : {}),
      ...(hasta ? { hasta } : {}),
    });
  }

  listarDeLaChequera(chequeraId: string, estado?: EstadoDelCheque) {
    return this.http.obtener<Cheque[]>(`/bancos/chequeras/${chequeraId}/cheques`, estado ? { estado } : undefined);
  }

  siguienteDisponible(cuentaBancariaId: string) {
    return this.http.obtener<Cheque | null>(`/bancos/cuentas-bancarias/${cuentaBancariaId}/siguiente-cheque`);
  }

  /** Emite el cheque; la respuesta trae además los avisos que no bloquean (fondos de un posfechado). */
  emitir(chequeId: string, datos: DatosDeEmisionDeCheque) {
    return this.http.crear<Movimiento & { avisos?: AvisoDeBancos[] }>(`/bancos/cheques/${chequeId}/emitir`, datos);
  }

  /**
   * Anula el cheque (disponible o emitido). `fecha` solo cuenta si el mes del cheque ya está conciliado:
   * es la de su nota de crédito inversa; si no, se anula sin nota inversa.
   */
  anular(chequeId: string, { motivo, fecha }: DatosDeBaja) {
    return this.http.crear<Cheque>(`/bancos/cheques/${chequeId}/anular`, { motivo, fecha });
  }

  /** Anula un cheque emitido porque el formulario se perdió o salió de la empresa: el título pudo circular. */
  anularComoExtraviado(chequeId: string, { motivo, fecha }: DatosDeBaja) {
    return this.http.crear<Cheque>(`/bancos/cheques/${chequeId}/anular`, { motivo, fecha, causa: 'extraviado' });
  }

  /** El papel quedó inservible y sigue en la empresa: el pago pasa al cheque destino y este queda inutilizado. */
  cambiarFormulario(chequeId: string, datos: DatosDeCambioDeFormulario) {
    return this.http.crear<ChequePasado>(`/bancos/cheques/${chequeId}/cambiar-formulario`, datos);
  }

  /** Cambia solo el concepto de cheques ya emitidos (pide `bancos.cheques.reclasificar`); queda en la auditoría. */
  reclasificar(datos: DatosDeReclasificacion) {
    return this.http.crear<ResultadoDeReclasificacion>('/bancos/cheques/reclasificar', datos);
  }

  /** Blanquea un cheque emitido por error: vuelve a disponible y su movimiento se elimina. */
  blanquear(chequeId: string, motivo: string) {
    return this.http.crear<Cheque>(`/bancos/cheques/${chequeId}/blanquear`, { motivo });
  }
}

export const apiCheques = new ApiCheques(clienteHttp);
