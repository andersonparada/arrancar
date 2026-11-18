import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { crearBusquedaEscalonada } from './busqueda-escalonada';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function preparar(traer: (texto: string) => Promise<string>) {
  const alResolver = vi.fn();
  const alFallar = vi.fn();
  return { buscar: crearBusquedaEscalonada({ traer, alResolver, alFallar, esperaMs: 300 }), alResolver, alFallar };
}

describe('búsqueda escalonada', () => {
  it('espera a que se deje de escribir y pide solo el último texto', async () => {
    const traer = vi.fn(async (texto: string) => `r-${texto}`);
    const { buscar, alResolver } = preparar(traer);
    buscar('a');
    await vi.advanceTimersByTimeAsync(200);
    buscar('ab');
    await vi.advanceTimersByTimeAsync(300);
    expect(traer).toHaveBeenCalledTimes(1);
    expect(traer).toHaveBeenCalledWith('ab');
    expect(alResolver).toHaveBeenCalledWith('r-ab');
  });

  it('descarta una respuesta lenta que llega después de una más nueva', async () => {
    const lentas: Array<(valor: string) => void> = [];
    const traer = vi.fn(() => new Promise<string>((resolver) => lentas.push(resolver)));
    const { buscar, alResolver } = preparar(traer);
    buscar('uno');
    await vi.advanceTimersByTimeAsync(300);
    buscar('dos');
    await vi.advanceTimersByTimeAsync(300);
    lentas[1]!('r-dos');
    lentas[0]!('r-uno');
    await vi.advanceTimersByTimeAsync(0);
    expect(alResolver).toHaveBeenCalledTimes(1);
    expect(alResolver).toHaveBeenCalledWith('r-dos');
  });

  it('con el texto vacío vuelve a la lista completa de inmediato y cancela lo pendiente', async () => {
    const traer = vi.fn(async (texto: string) => texto);
    const { buscar, alResolver } = preparar(traer);
    buscar('abc');
    buscar('');
    await vi.advanceTimersByTimeAsync(500);
    expect(traer).not.toHaveBeenCalled();
    expect(alResolver).toHaveBeenCalledWith(null);
  });

  it('avisa si el servidor falla, salvo que ya haya otra búsqueda', async () => {
    const traer = vi.fn(async () => {
      throw new Error('falló');
    });
    const { buscar, alFallar } = preparar(traer);
    buscar('abc');
    await vi.advanceTimersByTimeAsync(300);
    expect(alFallar).toHaveBeenCalledTimes(1);
  });
});
