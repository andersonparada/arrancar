import { describe, expect, it } from 'vitest';
import {
  DemasiadosDocumentosEnElReparto,
  DemasiadosPagosEnElReparto,
  FechaDePagoEnEfectivoInvalida,
  PagoMayorQueElRetiro,
  ProveedorRepetidoEnElReparto,
} from './errores-de-pagos-en-efectivo.js';
import { exigirFechaDelPagoEnEfectivo, exigirQueAlcanzaElRetiro, exigirRepartoValido } from './reparto-de-efectivo.js';

const pago = (proveedorId: string, cargos = 1) => ({ proveedorId, aplicaciones: new Array(cargos).fill(0) });

describe('reparto de efectivo', () => {
  it('lleva de 1 a 20 pagos', () => {
    expect(() => exigirRepartoValido([])).toThrow(DemasiadosPagosEnElReparto);
    const veintiuno = Array.from({ length: 21 }, (_, n) => pago(`p${n}`));
    expect(() => exigirRepartoValido(veintiuno)).toThrow(DemasiadosPagosEnElReparto);
    expect(() => exigirRepartoValido(veintiuno.slice(0, 20))).not.toThrow();
  });

  it('un proveedor una sola vez', () => {
    expect(() => exigirRepartoValido([pago('a'), pago('b'), pago('a')])).toThrow(ProveedorRepetidoEnElReparto);
  });

  it('hasta 300 cargos entre todos', () => {
    expect(() => exigirRepartoValido([pago('a', 100), pago('b', 100), pago('c', 100)])).not.toThrow();
    expect(() => exigirRepartoValido([pago('a', 100), pago('b', 100), pago('c', 101)])).toThrow(
      DemasiadosDocumentosEnElReparto,
    );
  });

  it('lo repartido cabe en el disponible', () => {
    const retiro = { numero: 3, anioDeNumero: 0 };
    expect(() => exigirQueAlcanzaElRetiro(retiro, { disponibleCentavos: 500, repartoCentavos: 500 })).not.toThrow();
    expect(() => exigirQueAlcanzaElRetiro(retiro, { disponibleCentavos: 500, repartoCentavos: 501 })).toThrow(
      PagoMayorQueElRetiro,
    );
  });

  it('la fecha no es futura ni anterior al retiro ni a la mínima', () => {
    const limites = { minima: '2026-11-05', fechaDelRetiro: '2026-11-08', hoy: '2026-11-12' };
    expect(() => exigirFechaDelPagoEnEfectivo('2026-11-08', limites)).not.toThrow();
    expect(() => exigirFechaDelPagoEnEfectivo('2026-11-12', limites)).not.toThrow();
    expect(() => exigirFechaDelPagoEnEfectivo('2026-11-07', limites)).toThrow(FechaDePagoEnEfectivoInvalida);
    expect(() => exigirFechaDelPagoEnEfectivo('2026-11-13', limites)).toThrow(FechaDePagoEnEfectivoInvalida);
  });
});
