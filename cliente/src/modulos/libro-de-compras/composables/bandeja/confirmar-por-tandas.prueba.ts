import { describe, expect, it, vi } from 'vitest';
import type { ResultadoDeConfirmacion } from '../../servicios/dte-recibidos.api';
import {
  confirmarPorTandas,
  textoDeLasTandas,
  textoDelAvance,
  textoDelCorte,
  type AvanceDeTandas,
} from './confirmar-por-tandas';

const ids = (cantidad: number) => Array.from({ length: cantidad }, (_, i) => `d${i + 1}`);
const registrar = async (lote: string[]): Promise<ResultadoDeConfirmacion[]> =>
  lote.map((id) => ({ id, documentoId: `doc-${id}`, avisos: [] }));

describe('confirmar por tandas de 100', () => {
  it('parte en tandas de 100, en orden, y avisa el avance antes de cada una', async () => {
    const tamanos: number[] = [];
    const avances: AvanceDeTandas[] = [];
    const resultado = await confirmarPorTandas(
      ids(230),
      (lote) => {
        tamanos.push(lote.length);
        return registrar(lote);
      },
      (avance) => avances.push(avance),
    );
    expect(tamanos).toEqual([100, 100, 30]);
    expect(avances.map(({ tanda, respondidos }) => [tanda, respondidos])).toEqual([
      [1, 0],
      [2, 100],
      [3, 200],
    ]);
    expect(resultado.resultados).toHaveLength(230);
    expect(resultado.corte).toBeNull();
  });

  it('una fila con error no detiene el envío', async () => {
    const enviar = vi.fn(async (lote: string[]): Promise<ResultadoDeConfirmacion[]> => [
      { id: lote[0] ?? '', error: { codigo: 'x', mensaje: 'no' } },
      ...(await registrar(lote.slice(1))),
    ]);
    const resultado = await confirmarPorTandas(ids(150), enviar, () => undefined);
    expect(enviar).toHaveBeenCalledTimes(2);
    expect(resultado.resultados).toHaveLength(150);
    expect(resultado.corte).toBeNull();
  });

  it('si una tanda falla se detiene y dice qué quedó sin confirmar', async () => {
    let llamadas = 0;
    const resultado = await confirmarPorTandas(
      ids(250),
      async (lote) => {
        if (++llamadas === 2) throw new Error('Sin conexión.');
        return registrar(lote);
      },
      () => undefined,
    );
    expect(llamadas).toBe(2);
    expect(resultado.resultados).toHaveLength(100);
    expect(resultado.corte).toMatchObject({ tanda: 2, tandas: 3, mensaje: 'Sin conexión.' });
    expect(resultado.corte?.sinConfirmar).toHaveLength(150);
    expect(resultado.corte?.deLaTandaQueFallo).toHaveLength(100);
    expect(resultado.corte?.sinConfirmar[0]).toBe('d101');
  });

  it('sin ids no envía nada', async () => {
    const enviar = vi.fn(registrar);
    expect(await confirmarPorTandas([], enviar, () => undefined)).toEqual({ resultados: [], corte: null });
    expect(enviar).not.toHaveBeenCalled();
  });
});

describe('textos de las tandas', () => {
  it('el avance dice la tanda y cuántos van', () => {
    expect(textoDelAvance({ tanda: 2, tandas: 5, respondidos: 100, total: 480 })).toBe(
      'Registrando la tanda 2 de 5: 100 de 480 documentos.',
    );
  });

  it('solo avisa de las tandas cuando son más de una', () => {
    expect(textoDeLasTandas(100)).toBeNull();
    expect(textoDeLasTandas(101)).toBe('Se envían en 2 tandas de hasta 100.');
  });

  it('el corte dice cuántas tandas y documentos quedaron registrados y cuáles no', () => {
    const corte = {
      tanda: 3,
      tandas: 5,
      mensaje: 'Sin conexión.',
      sinConfirmar: ids(230),
      deLaTandaQueFallo: ids(100),
    };
    const texto = textoDelCorte(corte, 200).join(' ');
    expect(texto).toContain('tanda 3 de 5');
    expect(texto).toContain('200 documentos (2 tandas completas)');
    expect(texto).toContain('230 documentos');
  });
});
