import { describe, expect, it } from 'vitest';
import { DestinoNoDisponible, DocumentoInvalido } from './errores-de-kardex.js';
import { AVISO_DE_DONACION_RECIBIDA, planDeEntradaManual, type EntradaManualEscrita } from './entrada-manual.js';
import type { RenglonDePlan } from './plan-de-documento.js';
import { planDeSalida, type SalidaEscrita } from './salida-por-consumo.js';

const renglon = (cambios: Partial<RenglonDePlan> = {}): RenglonDePlan => ({
  articuloId: 'a1',
  loteId: null,
  cantidad: 100000n,
  cantidadEscrita: 100000n,
  unidadEscritaId: 'lb',
  costoTotal: 2000n,
  ...cambios,
});

const entrada = (cambios: Partial<EntradaManualEscrita> = {}): EntradaManualEscrita => ({
  fecha: '2026-01-10',
  bodegaId: 'b1',
  causa: 'produccion_propia',
  soporte: ' Orden 1 ',
  observaciones: null,
  renglones: [renglon()],
  ...cambios,
});

const salida = (cambios: Partial<SalidaEscrita> = {}): SalidaEscrita => ({
  fecha: '2026-01-10',
  bodegaId: 'b1',
  destino: 'gasto',
  conceptoDeGastoId: 'c1',
  localidadId: null,
  departamentoId: null,
  entregadoA: ' Pedro ',
  observaciones: null,
  renglones: [renglon()],
  ...cambios,
});

describe('entrada manual', () => {
  it('recorta el soporte y avisa que lo del libro se recibe desde allí', () => {
    const plan = planDeEntradaManual(entrada());

    expect(plan).toMatchObject({ clase: 'entrada_manual', soporte: 'Orden 1', destino: null });
    expect(plan.avisos).toHaveLength(1);
  });

  it('exige renglones, cantidades mayores que cero, soporte y causa conocida', () => {
    expect(() => planDeEntradaManual(entrada({ renglones: [] }))).toThrow(DocumentoInvalido);
    expect(() => planDeEntradaManual(entrada({ renglones: [renglon({ cantidad: 0n })] }))).toThrow(DocumentoInvalido);
    expect(() => planDeEntradaManual(entrada({ soporte: '  ' }))).toThrow(DocumentoInvalido);
    expect(() => planDeEntradaManual(entrada({ causa: 'robo' as never }))).toThrow(DocumentoInvalido);
    expect(() => planDeEntradaManual(entrada({ soporte: 'x'.repeat(151) }))).toThrow(DocumentoInvalido);
  });

  it('el costo cero solo se admite en la donación recibida, que además trae el aviso de la NIIF', () => {
    const sinCosto = [renglon({ costoTotal: 0n })];

    expect(() => planDeEntradaManual(entrada({ renglones: sinCosto }))).toThrow(DocumentoInvalido);
    const donacion = planDeEntradaManual(entrada({ causa: 'donacion_recibida', renglones: sinCosto }));
    expect(donacion.avisos).toContain(AVISO_DE_DONACION_RECIBIDA);
  });

  it('un costo negativo nunca vale', () => {
    expect(() => planDeEntradaManual(entrada({ renglones: [renglon({ costoTotal: -1n })] }))).toThrow(
      DocumentoInvalido,
    );
  });
});

describe('salida por consumo', () => {
  it('lleva su destino y concepto, recorta quien recibe y deja el costo en cero para que lo ponga el método', () => {
    const plan = planDeSalida(salida());

    expect(plan).toMatchObject({
      clase: 'salida_por_consumo',
      destino: 'gasto',
      conceptoDeGastoId: 'c1',
      entregadoA: 'Pedro',
      soporte: null,
      causa: null,
    });
    expect(plan.renglones.every((r) => r.costoTotal === 0n)).toBe(true);
  });

  it('a gasto exige el concepto de gasto', () => {
    expect(() => planDeSalida(salida({ conceptoDeGastoId: null }))).toThrow(DocumentoInvalido);
  });

  it('los destinos de Activos fijos todavía no están disponibles', () => {
    expect(() => planDeSalida(salida({ destino: 'obra_de_activo_fijo' }))).toThrow(DestinoNoDisponible);
    expect(() => planDeSalida(salida({ destino: 'mantenimiento_de_activo_fijo' }))).toThrow(DestinoNoDisponible);
    expect(() => planDeSalida(salida({ destino: 'otro' as never }))).toThrow(DocumentoInvalido);
  });
});
