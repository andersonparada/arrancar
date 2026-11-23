import { describe, expect, it } from 'vitest';
import { exigirConceptoElegible } from './asignacion-de-concepto.js';
import {
  ConceptoDeSistemaNoSeElige,
  ConceptoIncompatible,
  ConceptoInactivo,
  ConceptoReservadoPorSuModulo,
} from './errores-de-conceptos.js';

const concepto = (cambios: Partial<Parameters<typeof exigirConceptoElegible>[0]> = {}) => ({
  aplicaA: 'ambos' as const,
  activo: true,
  claveDeSistema: null,
  ...cambios,
});

describe('exigirConceptoElegible', () => {
  it('acepta un concepto activo, propio y compatible', () => {
    expect(() => exigirConceptoElegible(concepto({ aplicaA: 'credito' }), 'credito')).not.toThrow();
    expect(() => exigirConceptoElegible(concepto({ aplicaA: 'debito' }), 'debito')).not.toThrow();
    expect(() => exigirConceptoElegible(concepto(), 'cheque')).not.toThrow();
  });

  it('el cheque cuenta como débito', () => {
    expect(() => exigirConceptoElegible(concepto({ aplicaA: 'debito' }), 'cheque')).not.toThrow();
    expect(() => exigirConceptoElegible(concepto({ aplicaA: 'credito' }), 'cheque')).toThrow(ConceptoIncompatible);
  });

  it('rechaza uno de sistema, incluido sin_clasificar', () => {
    expect(() => exigirConceptoElegible(concepto({ claveDeSistema: 'sin_clasificar' }), 'debito')).toThrow(
      ConceptoDeSistemaNoSeElige,
    );
    expect(() => exigirConceptoElegible(concepto({ claveDeSistema: 'transferencia' }), 'credito')).toThrow(
      ConceptoDeSistemaNoSeElige,
    );
  });

  it('rechaza uno inactivo, salvo que el movimiento ya lo tuviera', () => {
    expect(() => exigirConceptoElegible(concepto({ activo: false }), 'debito')).toThrow(ConceptoInactivo);
    expect(() => exigirConceptoElegible(concepto({ activo: false }), 'debito', { yaAsignado: true })).not.toThrow();
  });

  it('rechaza uno incompatible con la dirección del dinero', () => {
    expect(() => exigirConceptoElegible(concepto({ aplicaA: 'debito' }), 'credito')).toThrow(ConceptoIncompatible);
    expect(() => exigirConceptoElegible(concepto({ aplicaA: 'credito' }), 'debito')).toThrow(ConceptoIncompatible);
  });

  const sinModulos = new Set<string>();

  describe('«Pago a proveedores» en un cheque o nota manual (P3)', () => {
    const pago = concepto({ claveDeSistema: 'pago_a_proveedor', aplicaA: 'debito' });

    it('se elige si Cuentas por pagar no está activo', () => {
      expect(() => exigirConceptoElegible(pago, 'cheque', { modulosActivos: sinModulos })).not.toThrow();
    });

    it('lo fija Cuentas por pagar si está activo', () => {
      expect(() => exigirConceptoElegible(pago, 'cheque', { modulosActivos: new Set(['cuentas-por-pagar']) })).toThrow(
        ConceptoReservadoPorSuModulo,
      );
    });

    it('sin la lista de módulos activos (transferencias) sigue siendo de sistema', () => {
      expect(() => exigirConceptoElegible(pago, 'debito')).toThrow(ConceptoDeSistemaNoSeElige);
    });

    it('la excepción es solo de ese concepto: los demás de sistema no se eligen ni en un cheque', () => {
      const sinClasificar = concepto({ claveDeSistema: 'sin_clasificar' });

      expect(() => exigirConceptoElegible(sinClasificar, 'cheque', { modulosActivos: sinModulos })).toThrow(
        ConceptoDeSistemaNoSeElige,
      );
    });

    it('sigue exigiendo que esté activo y sea compatible', () => {
      const inactivo = concepto({ claveDeSistema: 'pago_a_proveedor', aplicaA: 'debito', activo: false });
      const decredito = concepto({ claveDeSistema: 'pago_a_proveedor', aplicaA: 'credito' });

      expect(() => exigirConceptoElegible(inactivo, 'cheque', { modulosActivos: sinModulos })).toThrow(
        ConceptoInactivo,
      );
      expect(() => exigirConceptoElegible(decredito, 'cheque', { modulosActivos: sinModulos })).toThrow(
        ConceptoIncompatible,
      );
    });
  });

  describe('conceptos reservados de Caja chica y Cuentas por liquidar (CCL-B1)', () => {
    const fondo = concepto({ claveDeSistema: 'fondo_de_caja_chica', aplicaA: 'debito' });
    const devolucion = concepto({ claveDeSistema: 'devolucion_de_anticipo', aplicaA: 'credito' });

    it('se eligen en un cheque o una nota si su módulo no está activo', () => {
      expect(() => exigirConceptoElegible(fondo, 'cheque', { modulosActivos: sinModulos })).not.toThrow();
      expect(() => exigirConceptoElegible(fondo, 'debito', { modulosActivos: sinModulos })).not.toThrow();
      expect(() => exigirConceptoElegible(devolucion, 'credito', { modulosActivos: sinModulos })).not.toThrow();
    });

    it('con su módulo activo, lo registra ese módulo y dice cuál', () => {
      const cajaChica = new Set(['caja-chica']);

      expect(() => exigirConceptoElegible(fondo, 'cheque', { modulosActivos: cajaChica })).toThrow(
        ConceptoReservadoPorSuModulo,
      );
      expect(() => exigirConceptoElegible(fondo, 'cheque', { modulosActivos: cajaChica })).toThrow(/Caja chica/);
    });

    it('el módulo del otro concepto no lo reserva', () => {
      const liquidar = new Set(['cuentas-por-liquidar']);

      expect(() => exigirConceptoElegible(fondo, 'cheque', { modulosActivos: liquidar })).not.toThrow();
      expect(() => exigirConceptoElegible(devolucion, 'credito', { modulosActivos: liquidar })).toThrow(
        /Cuentas por liquidar/,
      );
    });

    it('el movimiento que ya lo tiene lo conserva al corregirlo, con o sin su módulo activo', () => {
      const cajaChica = new Set(['caja-chica']);

      expect(() => exigirConceptoElegible(fondo, 'debito', { yaAsignado: true })).not.toThrow();
      expect(() =>
        exigirConceptoElegible(fondo, 'debito', { yaAsignado: true, modulosActivos: cajaChica }),
      ).not.toThrow();
    });

    it('conservarlo no libera a «Sin clasificar»', () => {
      const sinClasificar = concepto({ claveDeSistema: 'sin_clasificar' });

      expect(() => exigirConceptoElegible(sinClasificar, 'debito', { yaAsignado: true })).toThrow(
        ConceptoDeSistemaNoSeElige,
      );
    });
  });

  describe('conceptos reservados de Cuentas por cobrar (VC-0b)', () => {
    const devolucion = concepto({ claveDeSistema: 'devolucion_a_cliente', aplicaA: 'debito' });
    const deActivo = concepto({ claveDeSistema: 'cobro_a_cliente_de_activo', aplicaA: 'credito' });
    const cobro = concepto({ claveDeSistema: 'cobro_a_cliente', aplicaA: 'credito' });
    const sinModulos = new Set<string>();

    it('se eligen en una nota si Cuentas por cobrar no está activo; activo, lo registra ese módulo', () => {
      expect(() => exigirConceptoElegible(devolucion, 'debito', { modulosActivos: sinModulos })).not.toThrow();
      expect(() => exigirConceptoElegible(deActivo, 'credito', { modulosActivos: sinModulos })).not.toThrow();
      expect(() =>
        exigirConceptoElegible(deActivo, 'credito', { modulosActivos: new Set(['cuentas-por-cobrar']) }),
      ).toThrow(/Cuentas por cobrar/);
    });

    it('«Cheque rechazado» se elige a mano sin Cuentas por cobrar, se conserva al corregir y con el módulo activo lo registra él', () => {
      const rechazado = concepto({ claveDeSistema: 'cheque_rechazado', aplicaA: 'debito' });

      expect(() => exigirConceptoElegible(rechazado, 'debito', { modulosActivos: sinModulos })).not.toThrow();
      expect(() =>
        exigirConceptoElegible(rechazado, 'debito', {
          yaAsignado: true,
          modulosActivos: new Set(['cuentas-por-cobrar']),
        }),
      ).not.toThrow();
      expect(() =>
        exigirConceptoElegible(rechazado, 'debito', { modulosActivos: new Set(['cuentas-por-cobrar']) }),
      ).toThrow(/Cuentas por cobrar/);
    });

    it('«Cobros a clientes» marca la nota: no se elige a mano en una nota, solo al marcarla', () => {
      expect(() => exigirConceptoElegible(cobro, 'credito', { modulosActivos: sinModulos })).toThrow(
        ConceptoDeSistemaNoSeElige,
      );
    });
  });
});
