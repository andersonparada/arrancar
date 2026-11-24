import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import type { TipoDeCuenta } from '../servicios/cuentas.api';

/** Los rubros de los estados financieros por grupo (`docs/modulos/diseno-contabilidad.md` §5.2). */
const RUBROS_POR_GRUPO: Record<string, Record<string, string>> = {
  Activo: {
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
  },
  Pasivo: {
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
  },
  Patrimonio: {
    capital: 'Capital',
    aportes_para_futuras_capitalizaciones: 'Aportes para futuras capitalizaciones',
    reservas: 'Reservas',
    superavit_por_revaluacion: 'Superávit por revaluación',
    resultados_acumulados: 'Resultados acumulados',
    resultado_del_ejercicio: 'Resultado del ejercicio',
  },
  Resultados: {
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
  },
};

const GRUPOS_CON_CORRIENTE = new Set(['Activo', 'Pasivo']);

const delGrupo = (grupo: string): Record<string, string> => RUBROS_POR_GRUPO[grupo] ?? {};

const grupoDe = (rubro: string): string | null =>
  Object.keys(RUBROS_POR_GRUPO).find((grupo) => rubro in delGrupo(grupo)) ?? null;

/** El nombre con que se muestra un rubro; si no se conoce, su clave. */
export const nombreDeRubro = (rubro: string | null): string =>
  rubro ? (delGrupo(grupoDe(rubro) ?? '')[rubro] ?? rubro) : '';

/** El tipo de cuenta al que pertenece un rubro (patrimonio, activo y pasivo son de balance). */
export const tipoDelRubro = (rubro: string): TipoDeCuenta =>
  grupoDe(rubro) === 'Resultados' ? 'resultados' : 'balance';

/** Solo los rubros de activo y de pasivo se separan en corriente y no corriente. */
export const admiteCorriente = (rubro: string | null): boolean =>
  rubro !== null && GRUPOS_CON_CORRIENTE.has(grupoDe(rubro) ?? '');

/** Los rubros que caben en el tipo de cuenta, por grupo y ordenados por nombre. */
export function opcionesDeRubro(tipo: TipoDeCuenta): OpcionBuscable<string | null>[] {
  const grupos = Object.keys(RUBROS_POR_GRUPO).filter((grupo) => (grupo === 'Resultados') === (tipo === 'resultados'));
  return grupos.flatMap((grupo) =>
    Object.entries(delGrupo(grupo))
      .map(([valor, texto]) => ({ valor: valor as string | null, texto, grupo }))
      .sort((a, b) => a.texto.localeCompare(b.texto, 'es')),
  );
}
