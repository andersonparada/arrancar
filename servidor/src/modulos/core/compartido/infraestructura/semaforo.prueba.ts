import { describe, expect, it } from 'vitest';
import { Semaforo } from './semaforo.js';

const pausa = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

describe('semáforo', () => {
  it('nunca corre más tareas a la vez que su máximo, y todas terminan', async () => {
    const semaforo = new Semaforo(2);
    let activas = 0;
    let picoDeActivas = 0;
    const tarea = async () => {
      activas += 1;
      picoDeActivas = Math.max(picoDeActivas, activas);
      await pausa(5);
      activas -= 1;
      return 'listo';
    };

    const resultados = await Promise.all(Array.from({ length: 6 }, () => semaforo.ejecutar(tarea)));

    expect(resultados).toEqual(Array(6).fill('listo'));
    expect(picoDeActivas).toBe(2);
  });

  it('libera el turno aunque la tarea falle', async () => {
    const semaforo = new Semaforo(1);

    await expect(semaforo.ejecutar(() => Promise.reject(new Error('falló')))).rejects.toThrow('falló');
    await expect(semaforo.ejecutar(async () => 'sigue')).resolves.toBe('sigue');
  });
});
