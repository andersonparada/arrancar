import { ROLES_DE_CUENTA, type RolDeCuenta } from '../../core/contratos/contabilidad.contratos.js';

/** Cómo se usa un rol de sistema: quién lo necesita y qué lleva (`docs/modulos/diseno-contabilidad.md` §3.9). */
export interface DefinicionDeRol {
  nombre: string;
  /** Las claves de los módulos que lo usan; la pantalla de enlaces lo enseña si alguno está activo. */
  modulos: readonly string[];
  /** Si se puede enlazar por llave (cuenta bancaria, categoría, regla…); sin llave rige para todas. */
  admiteLlave: boolean;
  /** Qué elige la llave (para la pantalla): «Cuenta bancaria», «Categoría de proveedor»… */
  nombreDeLlave: string | null;
  /**
   * Un auxiliar lleva el detalle de la cuenta: al enlazarla queda marcada como cuenta de control. Lo es solo si un módulo
   * responde su saldo por rol y llave, ese módulo registra lo que lo aumenta y lo que lo extingue, y nadie necesita
   * partida manual en la cuenta en la operación normal (dictamen del contador, §5.3).
   */
  esDeAuxiliar: boolean;
  /** Sin enlace el hecho se contabiliza igual con otra regla (p. ej. el IVA no acreditable va al costo de la línea). */
  opcional: boolean;
}

interface Opciones {
  llave?: string;
  auxiliar?: boolean;
  opcional?: boolean;
}

const rol = (
  nombre: string,
  modulos: readonly string[],
  { llave, auxiliar = false, opcional = false }: Opciones = {},
): DefinicionDeRol => ({
  nombre,
  modulos,
  admiteLlave: llave !== undefined,
  nombreDeLlave: llave ?? null,
  esDeAuxiliar: auxiliar,
  opcional,
});

const COMPRAS = 'libro-de-compras';
const PAGAR = 'cuentas-por-pagar';
const LIQUIDAR = 'cuentas-por-liquidar';
const CAJA = 'caja-chica';
const ACTIVOS = 'activos-fijos';
const BANCOS = 'bancos';
const PROPIOS = ['contabilidad'];

/** Todos los roles de sistema, con lo que la pantalla de enlaces necesita saber de cada uno. */
export const DEFINICIONES_DE_ROLES: Readonly<Record<RolDeCuenta, DefinicionDeRol>> = {
  proveedores: rol('Proveedores', [COMPRAS, PAGAR], { llave: 'Categoría de proveedor', auxiliar: true }),
  iva_credito_fiscal: rol('IVA crédito fiscal', [COMPRAS]),
  iva_no_acreditable: rol('IVA no acreditable', [COMPRAS], { opcional: true }),
  retencion_por_pagar: rol('Retención por pagar', [COMPRAS, CAJA], {
    llave: 'Regla de retención',
    auxiliar: true,
  }),
  gasto_por_concepto: rol('Gasto por concepto del libro', [COMPRAS], { llave: 'Concepto de gasto' }),
  documentos_por_asignar: rol('Documentos por asignar', [COMPRAS, CAJA, LIQUIDAR], { auxiliar: true }),
  puente_compras_de_activos: rol('Puente de compras de activos', [COMPRAS, ACTIVOS]),
  pagos_por_aplicar: rol('Pagos por aplicar', [BANCOS, PAGAR], { auxiliar: true }),
  saldos_por_regularizar: rol('Saldos por regularizar', [BANCOS, PAGAR]),
  efectivo_para_pagos: rol('Efectivo para pagos', [BANCOS, PAGAR], { auxiliar: true }),
  cuenta_bancaria: rol('Cuenta bancaria', [BANCOS, PAGAR, LIQUIDAR, CAJA], {
    llave: 'Cuenta bancaria',
    auxiliar: true,
  }),
  concepto_bancario: rol('Concepto bancario', [BANCOS], { llave: 'Concepto bancario' }),
  isr_sobre_intereses: rol('ISR sobre intereses (gasto)', [BANCOS]),
  fondos_en_transito: rol('Fondos en tránsito', [BANCOS]),
  apertura_por_regularizar: rol('Apertura por regularizar', [PAGAR]),
  iva_por_rectificar: rol('IVA por rectificar', [COMPRAS]),
  caja_chica: rol('Caja chica', [CAJA], { llave: 'Fondo', auxiliar: true }),
  anticipos_por_liquidar: rol('Anticipos por liquidar', [LIQUIDAR, PAGAR, CAJA], { auxiliar: true }),
  cuentas_por_cobrar_a_empleados: rol('Cuentas por cobrar a empleados', [LIQUIDAR, PAGAR, CAJA]),
  perdidas_no_deducibles: rol('Pérdidas no deducibles', [CAJA, LIQUIDAR, PAGAR]),
  otros_ingresos: rol('Otros ingresos', [CAJA, LIQUIDAR, PAGAR]),
  puente_de_apertura: rol('Puente de apertura', PROPIOS),
  activo_fijo: rol('Activo fijo', [ACTIVOS], { llave: 'Clase de activo', auxiliar: true }),
  depreciacion_acumulada: rol('Depreciación acumulada', [ACTIVOS], { llave: 'Clase de activo', auxiliar: true }),
  gasto_de_depreciacion: rol('Gasto de depreciación', [ACTIVOS], { llave: 'Clase de activo' }),
  construcciones_en_curso: rol('Construcciones en curso', [ACTIVOS], { auxiliar: true }),
  resultado_en_venta_de_activos: rol('Resultado en venta de activos', [ACTIVOS]),
  perdida_en_baja_de_activos: rol('Pérdida en baja de activos', [ACTIVOS]),
  iva_debito_fiscal: rol('IVA débito fiscal', [ACTIVOS]),
  cuentas_por_cobrar_otras: rol('Cuentas por cobrar (otras)', [ACTIVOS]),
  diferencial_realizado_ganancia: rol('Diferencial realizado (ganancia)', ['multimoneda']),
  diferencial_realizado_perdida: rol('Diferencial realizado (pérdida)', ['multimoneda']),
  diferencial_no_realizado_ganancia: rol('Diferencial no realizado (ganancia)', ['multimoneda']),
  diferencial_no_realizado_perdida: rol('Diferencial no realizado (pérdida)', ['multimoneda']),
  isr_gasto_corriente: rol('ISR gasto corriente', PROPIOS),
  isr_por_pagar: rol('ISR por pagar', PROPIOS),
  isr_diferido_resultado: rol('ISR diferido (resultado)', PROPIOS),
  isr_diferido_activo: rol('ISR diferido activo', PROPIOS),
  isr_diferido_pasivo: rol('ISR diferido pasivo', PROPIOS),
  resultado_del_ejercicio: rol('Resultado del ejercicio', PROPIOS),
  resultados_acumulados: rol('Resultados acumulados', PROPIOS),
  ajustes_de_ejercicios_anteriores: rol('Ajustes de ejercicios anteriores', PROPIOS),
  reserva_legal: rol('Reserva legal', PROPIOS),
};

/** Los roles que un conjunto de módulos activos necesita, en el orden del catálogo. */
export function rolesDeLosModulos(activos: ReadonlySet<string>): RolDeCuenta[] {
  return ROLES_DE_CUENTA.filter((clave) => DEFINICIONES_DE_ROLES[clave].modulos.some((modulo) => activos.has(modulo)));
}
