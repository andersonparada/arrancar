import { describe, expect, it } from 'vitest';
import { exigirConceptoElegible } from './asignacion-de-concepto.js';
import {
  ConceptoDeSistemaNoSeElige,
  ConceptoIncompatible,
  ConceptoInactivo,
  PagoAProveedoresLoFijaCuentasPorPagar,
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

  describe('«Pago a proveedores» en un cheque manual (P3)', () => {
    const pago = concepto({ claveDeSistema: 'pago_a_proveedor', aplicaA: 'debito' });

    it('se elige si Cuentas por pagar no está activo', () => {
      expect(() => exigirConceptoElegible(pago, 'cheque', { pagoAProveedores: 'permitido' })).not.toThrow();
    });

    it('lo fija Cuentas por pagar si está activo', () => {
      expect(() => exigirConceptoElegible(pago, 'cheque', { pagoAProveedores: 'reservado' })).toThrow(
        PagoAProveedoresLoFijaCuentasPorPagar,
      );
    });

    it('sin la tolerancia (notas, transferencias) sigue siendo de sistema', () => {
      expect(() => exigirConceptoElegible(pago, 'debito')).toThrow(ConceptoDeSistemaNoSeElige);
    });

    it('la excepción es solo de ese concepto: los demás de sistema no se eligen ni en un cheque', () => {
      const sinClasificar = concepto({ claveDeSistema: 'sin_clasificar' });

      expect(() => exigirConceptoElegible(sinClasificar, 'cheque', { pagoAProveedores: 'permitido' })).toThrow(
        ConceptoDeSistemaNoSeElige,
      );
    });

    it('sigue exigiendo que esté activo y sea compatible', () => {
      const inactivo = concepto({ claveDeSistema: 'pago_a_proveedor', aplicaA: 'debito', activo: false });
      const decredito = concepto({ claveDeSistema: 'pago_a_proveedor', aplicaA: 'credito' });

      expect(() => exigirConceptoElegible(inactivo, 'cheque', { pagoAProveedores: 'permitido' })).toThrow(
        ConceptoInactivo,
      );
      expect(() => exigirConceptoElegible(decredito, 'cheque', { pagoAProveedores: 'permitido' })).toThrow(
        ConceptoIncompatible,
      );
    });
  });
});
