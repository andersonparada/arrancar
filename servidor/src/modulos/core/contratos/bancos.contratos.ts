/**
 * Órdenes y avisos de `bancos` (ver `mediador.contratos.ts`; diseño en `docs/modulos/diseno-cp4-pagos.md` §6.1).
 * Cuentas por pagar (y los módulos de destino que vengan) llaman las órdenes desde sus pantallas; Bancos las atiende
 * con los mismos casos de uso que su propia pantalla, sin pedir su propio permiso. El aviso es de Bancos: corre dentro
 * de su transacción y quien lo escucha revierte lo suyo o lanza su error (se deshace todo). El dinero viaja en centavos
 * enteros.
 */

/** El documento de otro módulo que originó un movimiento (sin llave foránea: vive en otro esquema). */
export interface OrigenDeMovimientoContrato {
  modulo: string;
  documentoId: string;
}

/** Conceptos de sistema que un módulo puede fijar por clave; Bancos los busca en el catálogo de la empresa. */
export type ClaveDeConceptoDeSistema =
  | 'pago_a_proveedor'
  | 'pago_a_proveedor_de_activo'
  | 'reintegro_de_proveedor'
  | 'reintegro_de_proveedor_de_activo'
  | 'efectivo_para_pagos'
  | 'devolucion_de_efectivo_para_pagos'
  | 'faltante_de_efectivo';

/** Una parte del movimiento clasificada con un concepto de sistema; las partes suman el monto. */
export interface LineaDeConcepto {
  claveDeSistema: ClaveDeConceptoDeSistema;
  montoCentavos: number;
}

/** Un aviso que no bloquea, para mostrar antes de confirmar. */
export interface AvisoDeBancos {
  codigo: string;
  mensaje: string;
}

/** Una chequera activa con su siguiente cheque disponible (nulo si ya no le quedan). */
export interface ChequeraParaPagar {
  chequeraId: string;
  serie: string | null;
  siguienteChequeId: string | null;
  siguienteNumero: number | null;
}

/** Una cuenta activa con su saldo a la fecha pedida y sus chequeras activas. */
export interface CuentaParaPagar {
  cuentaBancariaId: string;
  nombre: string;
  bancoNombre: string | null;
  numero: string;
  saldoCentavos: number;
  chequeras: ChequeraParaPagar[];
}

export interface MediosDePago {
  cuentas: CuentaParaPagar[];
}

/** Cómo se anuló un movimiento: a la antigua (sin inverso) o con su movimiento inverso. */
export type FormaDeAnulacion = 'sin_inverso' | 'con_inverso';

/** Qué se va a hacer con un movimiento que tiene origen en otro módulo o está marcado para Cuentas por pagar. */
export type CambioDeMovimiento = 'anular' | 'eliminar' | 'blanquear' | 'corregir' | 'reclasificar' | 'desmarcar';

declare module './mediador.contratos.js' {
  interface OrdenesEntreModulos {
    /** Cuentas activas, chequeras activas con su siguiente cheque disponible y saldo de cada cuenta, para la ventana de pago. */
    'bancos.medios_de_pago': { datos: { fecha: string }; respuesta: MediosDePago };
    /** Emite el siguiente cheque disponible (o el indicado) de la chequera, con origen y conceptos fijos. */
    'bancos.emitir_cheque_de_origen': {
      datos: {
        origen: OrigenDeMovimientoContrato;
        chequeraId: string;
        chequeId?: string;
        fecha: string;
        montoCentavos: number;
        beneficiario: string;
        noNegociable: boolean;
        conceptos: LineaDeConcepto[];
        referencia?: string;
        observaciones?: string;
      };
      respuesta: {
        movimientoId: string;
        chequeId: string;
        numeroDeCheque: number;
        cuentaBancariaId: string;
        avisos: AvisoDeBancos[];
      };
    };
    /** Registra una nota de débito (pago por transferencia o débito) o de crédito (reintegro), con origen y conceptos fijos. */
    'bancos.registrar_nota_de_origen': {
      datos: {
        origen: OrigenDeMovimientoContrato;
        cuentaBancariaId: string;
        tipo: 'debito' | 'credito';
        fecha: string;
        montoCentavos: number;
        beneficiario: string;
        conceptos: LineaDeConcepto[];
        referencia?: string;
        observaciones?: string;
      };
      respuesta: { movimientoId: string; numero: number; anioDeNumero: number; avisos: AvisoDeBancos[] };
    };
    /** Anula un movimiento que creó el módulo que lo pide (cheque a la antigua o con inverso, nota con inverso); no le devuelve el aviso. */
    'bancos.anular_movimiento_de_origen': {
      datos: { origen: OrigenDeMovimientoContrato; movimientoId: string; motivo: string; fecha?: string };
      respuesta: { forma: FormaDeAnulacion; inversoId: string | null };
    };
    /**
     * Fija (reemplaza) el reparto por concepto de un movimiento con origen del módulo que lo pide o de una nota marcada
     * para Cuentas por pagar. Solo clasifica el flujo: el monto, la fecha y la conciliación no cambian. Idempotente.
     */
    'bancos.fijar_desglose_de_conceptos': {
      datos: { movimientoId: string; origen: OrigenDeMovimientoContrato | null; conceptos: LineaDeConcepto[] };
      respuesta: { conDesglose: boolean };
    };
  }
  interface AvisosEntreModulos {
    /**
     * Antes de cambiar un movimiento que tiene origen en otro módulo o que está marcado para Cuentas por pagar: el
     * módulo revisa sus reglas y revierte lo suyo (anular) o lanza su error (se deshace todo). Idempotente.
     */
    'bancos.movimiento_por_cambiar': {
      movimientoId: string;
      moduloDeOrigen: string | null;
      documentoDeOrigenId: string | null;
      cambio: CambioDeMovimiento;
      /** Solo en `anular`. */
      formaDeAnulacion: FormaDeAnulacion | null;
      motivo: string | null;
      fecha: string | null;
    };
  }
}

export {};
