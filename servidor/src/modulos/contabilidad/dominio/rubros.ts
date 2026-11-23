/**
 * Rubros de los estados financieros que una cuenta de detalle puede tener (`docs/modulos/diseno-contabilidad.md`
 * §5.2, lista validada por el contador el 2026-11-19). El grupo se deduce del rubro.
 */
export const RUBROS_DE_ACTIVO = [
  'efectivo',
  'cuentas_por_cobrar',
  'cuentas_por_cobrar_partes_relacionadas',
  'anticipos_a_proveedores',
  'inventarios',
  'impuestos_por_recuperar',
  'gastos_anticipados',
  'inversiones',
  'propiedad_planta_y_equipo',
  'propiedades_de_inversion',
  'intangibles',
  'activos_biologicos',
  'impuesto_diferido_activo',
  'otros_activos',
] as const;

export const RUBROS_DE_PASIVO = [
  'proveedores',
  'cuentas_por_pagar_partes_relacionadas',
  'prestamos_corto_plazo',
  'impuestos_por_pagar',
  'retenciones_por_pagar',
  'beneficios_a_empleados',
  'ingresos_diferidos',
  'otras_cuentas_por_pagar',
  'provisiones',
  'prestamos_largo_plazo',
  'impuesto_diferido_pasivo',
  'otros_pasivos',
] as const;

export const RUBROS_DE_PATRIMONIO = [
  'capital',
  'aportes_para_futuras_capitalizaciones',
  'reservas',
  'superavit_por_revaluacion',
  'resultados_acumulados',
  'resultado_del_ejercicio',
] as const;

export const RUBROS_DE_RESULTADOS = [
  'ingresos_ordinarios',
  'costo_de_ventas',
  'costo_de_produccion',
  'gastos_de_venta',
  'gastos_de_administracion',
  'otros_ingresos',
  'otros_gastos',
  'cambio_en_valor_razonable_de_activos_biologicos',
  'ingresos_financieros',
  'gastos_financieros',
  'diferencial_cambiario',
  'impuesto_sobre_la_renta',
] as const;

export const RUBROS = [
  ...RUBROS_DE_ACTIVO,
  ...RUBROS_DE_PASIVO,
  ...RUBROS_DE_PATRIMONIO,
  ...RUBROS_DE_RESULTADOS,
] as const;

export type Rubro = (typeof RUBROS)[number];

export type TipoDeCuenta = 'balance' | 'resultados';

/** El tipo de cuenta al que pertenece un rubro: patrimonio, activo y pasivo son de balance. */
export function tipoDelRubro(rubro: Rubro): TipoDeCuenta {
  return (RUBROS_DE_RESULTADOS as readonly string[]).includes(rubro) ? 'resultados' : 'balance';
}

/** Solo los rubros de activo y de pasivo se separan en corriente y no corriente. */
export function admiteCorriente(rubro: Rubro): boolean {
  return (
    (RUBROS_DE_ACTIVO as readonly string[]).includes(rubro) || (RUBROS_DE_PASIVO as readonly string[]).includes(rubro)
  );
}

/** Lo que lee el usuario de cada rubro. */
export const NOMBRES_DE_RUBRO: Record<Rubro, string> = {
  efectivo: 'Efectivo',
  cuentas_por_cobrar: 'Cuentas por cobrar',
  cuentas_por_cobrar_partes_relacionadas: 'Cuentas por cobrar a partes relacionadas',
  anticipos_a_proveedores: 'Anticipos a proveedores',
  inventarios: 'Inventarios',
  impuestos_por_recuperar: 'Impuestos por recuperar',
  gastos_anticipados: 'Gastos anticipados',
  inversiones: 'Inversiones',
  propiedad_planta_y_equipo: 'Propiedad, planta y equipo',
  propiedades_de_inversion: 'Propiedades de inversión',
  intangibles: 'Intangibles',
  activos_biologicos: 'Activos biológicos',
  impuesto_diferido_activo: 'Impuesto diferido activo',
  otros_activos: 'Otros activos',
  proveedores: 'Proveedores',
  cuentas_por_pagar_partes_relacionadas: 'Cuentas por pagar a partes relacionadas',
  prestamos_corto_plazo: 'Préstamos a corto plazo',
  impuestos_por_pagar: 'Impuestos por pagar',
  retenciones_por_pagar: 'Retenciones por pagar',
  beneficios_a_empleados: 'Beneficios a empleados',
  ingresos_diferidos: 'Ingresos diferidos',
  otras_cuentas_por_pagar: 'Otras cuentas por pagar',
  provisiones: 'Provisiones',
  prestamos_largo_plazo: 'Préstamos a largo plazo',
  impuesto_diferido_pasivo: 'Impuesto diferido pasivo',
  otros_pasivos: 'Otros pasivos',
  capital: 'Capital',
  aportes_para_futuras_capitalizaciones: 'Aportes para futuras capitalizaciones',
  reservas: 'Reservas',
  superavit_por_revaluacion: 'Superávit por revaluación',
  resultados_acumulados: 'Resultados acumulados',
  resultado_del_ejercicio: 'Resultado del ejercicio',
  ingresos_ordinarios: 'Ingresos ordinarios',
  costo_de_ventas: 'Costo de ventas',
  costo_de_produccion: 'Costo de producción',
  gastos_de_venta: 'Gastos de venta',
  gastos_de_administracion: 'Gastos de administración',
  otros_ingresos: 'Otros ingresos',
  otros_gastos: 'Otros gastos',
  cambio_en_valor_razonable_de_activos_biologicos: 'Cambio en el valor razonable de activos biológicos',
  ingresos_financieros: 'Ingresos financieros',
  gastos_financieros: 'Gastos financieros',
  diferencial_cambiario: 'Diferencial cambiario',
  impuesto_sobre_la_renta: 'Impuesto sobre la renta',
};
