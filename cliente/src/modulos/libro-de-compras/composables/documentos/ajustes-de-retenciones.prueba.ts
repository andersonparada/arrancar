import { describe, expect, it } from 'vitest';
import type { RetencionDeDocumento } from '../../servicios/documentos.api';
import {
  ajustesIncompletos,
  ajustesParaElCuerpo,
  ajustesVigentes,
  cambiaLoPropuesto,
  faltaElMotivo,
  montoFueraDeRango,
} from './ajustes-de-retenciones';

const retencion = (cambios: Partial<RetencionDeDocumento> = {}): RetencionDeDocumento => ({
  impuesto: 'iva',
  regla: 'iva_contribuyente_especial',
  base: '100.00',
  porcentaje: '15.00',
  montoPropuesto: '15.00',
  monto: '15.00',
  motivoDelAjuste: null,
  fecha: '2026-10-18',
  ...cambios,
});

describe('ajustes de retenciones', () => {
  it('solo es un ajuste si el monto difiere del propuesto', () => {
    expect(cambiaLoPropuesto({ monto: '15', motivo: '' }, retencion())).toBe(false);
    expect(cambiaLoPropuesto({ monto: 15.0, motivo: '' }, retencion())).toBe(false);
    expect(cambiaLoPropuesto({ monto: '0', motivo: '' }, retencion())).toBe(true);
    expect(cambiaLoPropuesto({ monto: '', motivo: '' }, retencion())).toBe(false);
  });

  it('cambiar el monto exige el motivo', () => {
    expect(faltaElMotivo({ monto: '10', motivo: '  ' }, retencion())).toBe(true);
    expect(faltaElMotivo({ monto: '10', motivo: 'Pagó la mitad' }, retencion())).toBe(false);
    expect(faltaElMotivo({ monto: '15', motivo: '' }, retencion())).toBe(false);
  });

  it('el monto no puede pasar de la base ni ser negativo', () => {
    expect(montoFueraDeRango({ monto: '100.01', motivo: 'x' }, retencion())).toBe(true);
    expect(montoFueraDeRango({ monto: '-1', motivo: 'x' }, retencion())).toBe(true);
    expect(montoFueraDeRango({ monto: '100', motivo: 'x' }, retencion())).toBe(false);
  });

  it('no deja registrar con un ajuste sin motivo o fuera de rango', () => {
    expect(ajustesIncompletos({ iva_contribuyente_especial: { monto: '5', motivo: '' } }, [retencion()])).toBe(true);
    expect(ajustesIncompletos({ iva_contribuyente_especial: { monto: '500', motivo: 'x' } }, [retencion()])).toBe(true);
    expect(ajustesIncompletos({ iva_contribuyente_especial: { monto: '5', motivo: 'x' } }, [retencion()])).toBe(false);
    expect(ajustesIncompletos({}, [retencion()])).toBe(false);
  });

  it('el cuerpo lleva el monto con dos decimales y el motivo sin espacios sobrantes', () => {
    const ajustes = { iva_contribuyente_especial: { monto: '0', motivo: ' No retuvo ' } };
    expect(ajustesParaElCuerpo(ajustes, [retencion()], false)).toEqual([
      { regla: 'iva_contribuyente_especial', monto: '0.00', motivo: 'No retuvo' },
    ]);
  });

  it('no manda un ajuste que quedó igual a lo propuesto', () => {
    const ajustes = { iva_contribuyente_especial: { monto: '15.00', motivo: '' } };
    expect(ajustesParaElCuerpo(ajustes, [retencion()], false)).toEqual([]);
  });

  it('solo manda ajustes de retenciones que se proponen', () => {
    const ajustes = { otra_regla: { monto: '1', motivo: 'x' } };
    expect(ajustesParaElCuerpo(ajustes, [retencion()], false)).toEqual([]);
  });

  it('quita los ajustes de retenciones que el nuevo cálculo ya no propone', () => {
    const ajustes = {
      iva_contribuyente_especial: { monto: '5', motivo: 'x' },
      isr_opcional_simplificado: { monto: '1', motivo: 'y' },
    };
    expect(Object.keys(ajustesVigentes(ajustes, [retencion()]))).toEqual(['iva_contribuyente_especial']);
  });
});
