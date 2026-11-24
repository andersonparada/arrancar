import { describe, expect, it } from 'vitest';
import { DocumentoInvalido, TrasladoALaMismaBodega } from './errores-de-kardex.js';
import type { RenglonDePlan } from './plan-de-documento.js';
import { planDeEntradaDeTraslado, planDeSalidaDeTraslado } from './traslado.js';

const renglon: RenglonDePlan = {
  articuloId: 'a1',
  loteId: null,
  cantidad: 500_000n,
  cantidadEscrita: 500_000n,
  unidadEscritaId: 'lb',
  costoTotal: 9_999n,
};

const escrito = {
  fecha: '2026-09-03',
  bodegaDeOrigenId: 'b1',
  bodegaDeDestinoId: 'b2',
  entregadoA: '  Pedro  ',
  observaciones: null,
  renglones: [renglon],
  conTransito: false,
};

describe('planDeSalidaDeTraslado', () => {
  it('sin tránsito nace recibido; con tránsito, en tránsito', () => {
    expect(planDeSalidaDeTraslado(escrito)).toMatchObject({
      clase: 'salida_de_traslado',
      bodegaId: 'b1',
      bodegaDeDestinoId: 'b2',
      estadoDeTraslado: 'recibido',
      entregadoA: 'Pedro',
    });
    expect(planDeSalidaDeTraslado({ ...escrito, conTransito: true }).estadoDeTraslado).toBe('en_transito');
  });

  it('descarta cualquier costo escrito: el traslado es neutro', () => {
    expect(planDeSalidaDeTraslado(escrito).renglones[0]!.costoTotal).toBe(0n);
  });

  it('el destino no puede ser el origen', () => {
    expect(() => planDeSalidaDeTraslado({ ...escrito, bodegaDeDestinoId: 'b1' })).toThrow(TrasladoALaMismaBodega);
  });

  it('exige renglones con cantidad mayor que cero', () => {
    expect(() => planDeSalidaDeTraslado({ ...escrito, renglones: [] })).toThrow(DocumentoInvalido);
    expect(() => planDeSalidaDeTraslado({ ...escrito, renglones: [{ ...renglon, cantidad: 0n }] })).toThrow(
      DocumentoInvalido,
    );
  });
});

describe('planDeEntradaDeTraslado', () => {
  const recepcion = {
    fechaDeLaSalida: '2026-09-03',
    fecha: '2026-09-03',
    bodegaDeDestinoId: 'b2',
    documentoDeLaSalidaId: 'd1',
    observaciones: null,
    renglones: [renglon],
  };

  it('es la entrada en el destino, ligada a la salida y sin costo', () => {
    expect(planDeEntradaDeTraslado(recepcion)).toMatchObject({
      clase: 'entrada_de_traslado',
      bodegaId: 'b2',
      documentoRelacionadoId: 'd1',
    });
    expect(planDeEntradaDeTraslado(recepcion).renglones[0]!.costoTotal).toBe(0n);
  });

  it('no puede ser anterior a la salida', () => {
    expect(() => planDeEntradaDeTraslado({ ...recepcion, fecha: '2026-09-02' })).toThrow(DocumentoInvalido);
  });
});
