import type { DatosDeConcepto } from './concepto.js';

/** Un concepto de la semilla; los de sistema llevan clave y el usuario no los toca. */
export interface ConceptoInicial {
  claveDeSistema: string | null;
  datos: DatosDeConcepto;
}

type Clasificacion = Pick<DatosDeConcepto, 'aplicaA' | 'actividadDeFlujo' | 'grupoDeFlujo'>;
type Banderas = Partial<Pick<DatosDeConcepto, 'esCargoBancario' | 'pideDatosDeIntereses' | 'admiteFactura'>>;

/** Las banderas nacen apagadas (también `admiteFactura`); solo se enciende lo que se indica. */
function concepto(claveDeSistema: string | null, nombre: string, resto: Clasificacion & Banderas): ConceptoInicial {
  const apagadas = { esCargoBancario: false, pideDatosDeIntereses: false, admiteFactura: false };
  return { claveDeSistema, datos: { nombre, ...apagadas, ...resto, activo: true } };
}

const sinFlujo = { actividadDeFlujo: 'ninguna', grupoDeFlujo: null } as const;
const operacion = (grupoDeFlujo: string) => ({ actividadDeFlujo: 'operacion', grupoDeFlujo }) as const;
const inversion = (grupoDeFlujo: string) => ({ actividadDeFlujo: 'inversion', grupoDeFlujo }) as const;
const financiamiento = (grupoDeFlujo: string) => ({ actividadDeFlujo: 'financiamiento', grupoDeFlujo }) as const;

/**
 * Los conceptos que el sistema usa por su cuenta (H3): no se editan, inactivan ni eliminan. `cheque_caduco` ya no
 * existe (P1): el inverso de un cheque caduco hereda el concepto del cheque.
 */
export const CONCEPTOS_DE_SISTEMA: readonly ConceptoInicial[] = [
  concepto('transferencia', 'Transferencia entre cuentas', { aplicaA: 'ambos', ...sinFlujo }),
  concepto('pago_a_proveedor', 'Pago a proveedores', { aplicaA: 'debito', ...operacion('Pagos a proveedores') }),
  concepto('saldo_inicial', 'Saldo inicial', { aplicaA: 'ambos', ...sinFlujo }),
  concepto('sin_clasificar', 'Sin clasificar', { aplicaA: 'ambos', ...sinFlujo }),
];

/** La lista sugerida: un punto de partida que cada empresa edita, inactiva o amplía. */
export const CONCEPTOS_SUGERIDOS: readonly ConceptoInicial[] = [
  concepto(null, 'Depósito de ventas', { aplicaA: 'credito', ...operacion('Cobros a clientes') }),
  concepto(null, 'Comisiones bancarias', {
    aplicaA: 'debito',
    ...operacion('Comisiones bancarias'),
    esCargoBancario: true,
  }),
  concepto(null, 'Intereses ganados', {
    aplicaA: 'credito',
    ...operacion('Intereses ganados'),
    esCargoBancario: true,
    pideDatosDeIntereses: true,
  }),
  concepto(null, 'Cheque rechazado', {
    aplicaA: 'debito',
    ...operacion('Cobros a clientes'),
    esCargoBancario: true,
  }),
  concepto(null, 'Planilla', { aplicaA: 'debito', ...operacion('Pagos de planilla') }),
  concepto(null, 'Préstamo recibido', { aplicaA: 'credito', ...financiamiento('Préstamos recibidos') }),
  concepto(null, 'Pago de préstamo', { aplicaA: 'debito', ...financiamiento('Pagos de préstamos') }),
  concepto(null, 'Compra de activo', { aplicaA: 'debito', ...inversion('Compra de activos') }),
  concepto(null, 'Aporte de socios', { aplicaA: 'credito', ...financiamiento('Aportes de socios') }),
  concepto(null, 'Retiro de socios', { aplicaA: 'debito', ...financiamiento('Retiros de socios') }),
  concepto(null, 'Impuestos', { aplicaA: 'debito', ...operacion('Pago de impuestos') }),
  // Agregados con P5 y P8 (las empresas ya sembradas los reciben con la migración 0022).
  concepto(null, 'Anticipo a proveedores', { aplicaA: 'debito', ...operacion('Anticipos a proveedores') }),
  concepto(null, 'Fondo de caja chica', { aplicaA: 'debito', ...sinFlujo }),
  concepto(null, 'Reintegro de caja chica', { aplicaA: 'debito', ...operacion('Reintegros de caja chica') }),
  concepto(null, 'IGSS, IRTRA e INTECAP', { aplicaA: 'debito', ...operacion('Cuotas de IGSS, IRTRA e INTECAP') }),
  concepto(null, 'Dividendos pagados', { aplicaA: 'debito', ...financiamiento('Dividendos pagados') }),
  concepto(null, 'Venta de activo', { aplicaA: 'credito', ...inversion('Venta de activos') }),
  concepto(null, 'Préstamo a empresa relacionada', {
    aplicaA: 'debito',
    ...inversion('Préstamos a empresas relacionadas'),
  }),
  concepto(null, 'Préstamo de empresa relacionada', {
    aplicaA: 'credito',
    ...financiamiento('Préstamos de empresas relacionadas'),
  }),
];

export const CONCEPTOS_INICIALES: readonly ConceptoInicial[] = [...CONCEPTOS_DE_SISTEMA, ...CONCEPTOS_SUGERIDOS];
