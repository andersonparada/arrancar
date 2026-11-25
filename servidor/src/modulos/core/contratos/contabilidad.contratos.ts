/**
 * Contrato de Contabilidad con los demás módulos (ver `mediador.contratos.ts`; diseño en
 * `docs/modulos/diseno-contabilidad.md` §3.9 y §8). Contabilidad hace las preguntas y responde cada módulo activo
 * que tenga algo que decir; sin Contabilidad, nadie las hace. El dinero viaja en centavos enteros y las fechas como
 * `AAAA-MM-DD`.
 */

/** Roles de sistema que una cuenta contable puede cumplir (§3.9). Los módulos los usan sin conocer el plan de cuentas. */
export const ROLES_DE_CUENTA = [
  'proveedores',
  'iva_credito_fiscal',
  'iva_no_acreditable',
  'retencion_por_pagar',
  'gasto_por_concepto',
  'documentos_por_asignar',
  'puente_compras_de_activos',
  'pagos_por_aplicar',
  'saldos_por_regularizar',
  'efectivo_para_pagos',
  'cuenta_bancaria',
  'concepto_bancario',
  'isr_sobre_intereses',
  'fondos_en_transito',
  'apertura_por_regularizar',
  'retenciones_de_apertura',
  'iva_por_rectificar',
  'caja_chica',
  'anticipos_por_liquidar',
  'cuentas_por_cobrar_a_empleados',
  'perdidas_no_deducibles',
  'otros_ingresos',
  'puente_de_apertura',
  'activo_fijo',
  'depreciacion_acumulada',
  'gasto_de_depreciacion',
  'construcciones_en_curso',
  'resultado_en_venta_de_activos',
  'perdida_en_baja_de_activos',
  'iva_debito_fiscal',
  'cuentas_por_cobrar_otras',
  'diferencial_realizado_ganancia',
  'diferencial_realizado_perdida',
  'diferencial_no_realizado_ganancia',
  'diferencial_no_realizado_perdida',
  'isr_gasto_corriente',
  'isr_por_pagar',
  'isr_diferido_resultado',
  'isr_diferido_activo',
  'isr_diferido_pasivo',
  'resultado_del_ejercicio',
  'resultados_acumulados',
  'ajustes_de_ejercicios_anteriores',
  'reserva_legal',
] as const;

export type RolDeCuenta = (typeof ROLES_DE_CUENTA)[number];

/** Para qué se piden los saldos de los auxiliares. */
export type PropositoDeSaldos = 'apertura' | 'cuadratura';

/** El saldo de un auxiliar para un rol (y su llave, si el rol la lleva). */
export interface LineaDeSaldoDeAuxiliar {
  rol: RolDeCuenta;
  /** La llave del rol (cuenta bancaria, categoría, clase…); `null` si el rol no lleva. */
  llave: string | null;
  terceroId: string | null;
  /** Positivo = deudor, negativo = acreedor. */
  montoCentavos: number;
  etiqueta: string;
}

export interface SaldosDeAuxiliares {
  nombreDelModulo: string;
  lineas: LineaDeSaldoDeAuxiliar[];
  /** Lo que el módulo no pudo calcular o dejó sin resolver, dicho para el usuario. */
  pendientes: string[];
}

/** Una llave que un módulo ofrece para enlazar un rol con una cuenta contable. */
export interface LlaveDeEnlace {
  llave: string;
  nombre: string;
  activo: boolean;
}

/** Base contable y base fiscal de un activo a una fecha (impuesto diferido, fase 2). */
export interface BaseDeActivo {
  activoId: string;
  nombre: string;
  baseContableCentavos: number;
  baseFiscalCentavos: number;
}

declare module './mediador.contratos.js' {
  interface PreguntasEntreModulos {
    /**
     * Si la fecha cae en un período contable abierto. Contabilidad responde; sin Contabilidad (o sin respuesta) la
     * fecha se considera abierta. Bancos y Libro de compras la hacen antes de anular o eliminar.
     */
    'contabilidad.estado_de_la_fecha': {
      datos: { fecha: string };
      respuesta: { abierta: boolean; primerDiaAbierto: string | null; definitiva: boolean } | null;
    };
    /** Los saldos de cada módulo por rol y llave, a una fecha, para la apertura y las cuadraturas. */
    'contabilidad.saldos_de_auxiliares': {
      datos: { fecha: string; proposito: PropositoDeSaldos };
      respuesta: SaldosDeAuxiliares | null;
    };
    /** Las llaves de un rol que el módulo ofrece (sus cuentas bancarias, conceptos, clases…). */
    'contabilidad.llaves_de_enlace': {
      datos: { rol: RolDeCuenta };
      respuesta: LlaveDeEnlace[] | null;
    };
    /** Fase 2: base contable y fiscal por activo a la fecha. */
    'contabilidad.bases_fiscales_y_contables': {
      datos: { fecha: string };
      respuesta: { activos: BaseDeActivo[] } | null;
    };
  }
}
