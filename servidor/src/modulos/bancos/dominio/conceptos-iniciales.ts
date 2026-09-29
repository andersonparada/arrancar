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

/** Los conceptos que el sistema usa por su cuenta (H3): no se editan, inactivan ni eliminan. */
export const CONCEPTOS_DE_SISTEMA: readonly ConceptoInicial[] = [
  concepto('transferencia', 'Transferencia entre cuentas', { aplicaA: 'ambos', ...sinFlujo }),
  concepto('pago_a_proveedor', 'Pago a proveedores', { aplicaA: 'debito', ...operacion('Pagos a proveedores') }),
  concepto('saldo_inicial', 'Saldo inicial', { aplicaA: 'ambos', ...sinFlujo }),
  concepto('sin_clasificar', 'Sin clasificar', { aplicaA: 'ambos', ...sinFlujo }),
  concepto('cheque_caduco', 'Cheque caduco', { aplicaA: 'credito', ...sinFlujo }),
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
    ...operacion('Cheques rechazados'),
    esCargoBancario: true,
  }),
  concepto(null, 'Planilla', { aplicaA: 'debito', ...operacion('Pagos de planilla') }),
  concepto(null, 'Préstamo recibido', { aplicaA: 'credito', ...financiamiento('Préstamos recibidos') }),
  concepto(null, 'Pago de préstamo', { aplicaA: 'debito', ...financiamiento('Pagos de préstamos') }),
  concepto(null, 'Compra de activo', { aplicaA: 'debito', ...inversion('Compra de activos') }),
  concepto(null, 'Aporte de socios', { aplicaA: 'credito', ...financiamiento('Aportes de socios') }),
  concepto(null, 'Retiro de socios', { aplicaA: 'debito', ...financiamiento('Retiros de socios') }),
  concepto(null, 'Impuestos', { aplicaA: 'debito', ...operacion('Pago de impuestos') }),
];

export const CONCEPTOS_INICIALES: readonly ConceptoInicial[] = [...CONCEPTOS_DE_SISTEMA, ...CONCEPTOS_SUGERIDOS];
