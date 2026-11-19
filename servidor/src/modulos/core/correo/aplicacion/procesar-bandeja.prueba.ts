import { afterEach, describe, expect, it } from 'vitest';
import { CORREOS_POR_LOTE } from './casos-uso/enviar-lote-de-correos.js';
import { ProcesarBandeja } from './procesar-bandeja.js';
import { RegistroEnMemoria } from '../pruebas/dobles-de-la-bandeja.js';

const esperar = (milisegundos: number) => new Promise((resolver) => setTimeout(resolver, milisegundos));

/** Un lote de mentira: devuelve lo programado (después, 0) y deja pasar el tiempo indicado. */
class LoteFalso {
  llamadas = 0;
  enCurso = 0;
  maximoSimultaneo = 0;
  respuestas: number[] = [];
  duracionEnMs = 0;
  falla = false;

  async ejecutar(): Promise<number> {
    this.llamadas += 1;
    this.enCurso += 1;
    this.maximoSimultaneo = Math.max(this.maximoSimultaneo, this.enCurso);
    await esperar(this.duracionEnMs);
    this.enCurso -= 1;
    if (this.falla) throw new Error('boom');
    return this.respuestas.shift() ?? 0;
  }
}

let procesador: ProcesarBandeja | null = null;

afterEach(async () => {
  await procesador?.detener();
  procesador = null;
});

function crear(lote: LoteFalso, opciones: { intervaloEnMs?: number; esperaAlApagarEnMs?: number } = {}) {
  const registro = new RegistroEnMemoria();
  let cerrado = 0;
  procesador = new ProcesarBandeja({ lote, registro, alCerrar: async () => void (cerrado += 1), ...opciones });
  return { registro, cerrados: () => cerrado };
}

describe('ProcesarBandeja', () => {
  it('al iniciar revisa la bandeja enseguida y después cada intervalo', async () => {
    const lote = new LoteFalso();
    crear(lote, { intervaloEnMs: 20 });

    procesador?.iniciar();
    await esperar(100);

    expect(lote.llamadas).toBeGreaterThanOrEqual(3);
  });

  it('despertar atiende ya, sin esperar al intervalo', async () => {
    const lote = new LoteFalso();
    crear(lote, { intervaloEnMs: 60_000 });
    procesador?.iniciar();
    await esperar(30);
    const antes = lote.llamadas;

    procesador?.despertar();
    await esperar(30);

    expect(lote.llamadas).toBe(antes + 1);
  });

  it('nunca corre dos lotes a la vez: si lo despiertan mientras trabaja, hace otra vuelta al terminar', async () => {
    const lote = new LoteFalso();
    lote.duracionEnMs = 40;
    crear(lote, { intervaloEnMs: 60_000 });
    procesador?.iniciar();
    await esperar(10);

    procesador?.despertar();
    procesador?.despertar();
    await esperar(150);

    expect(lote.maximoSimultaneo).toBe(1);
    expect(lote.llamadas).toBe(2);
  });

  it('sigue con otro lote mientras el anterior salga lleno', async () => {
    const lote = new LoteFalso();
    lote.respuestas = [CORREOS_POR_LOTE, CORREOS_POR_LOTE, 3];
    crear(lote, { intervaloEnMs: 60_000 });

    procesador?.iniciar();
    await esperar(60);

    expect(lote.llamadas).toBe(3);
  });

  it('si un lote falla lo registra y sigue vivo', async () => {
    const lote = new LoteFalso();
    lote.falla = true;
    const { registro } = crear(lote, { intervaloEnMs: 20 });

    procesador?.iniciar();
    await esperar(80);

    expect(registro.errores.length).toBeGreaterThanOrEqual(2);
  });

  it('al detener (SIGTERM) espera el lote en curso, no toma otro y cierra el transporte', async () => {
    const lote = new LoteFalso();
    lote.duracionEnMs = 50;
    const { cerrados } = crear(lote, { intervaloEnMs: 10 });
    procesador?.iniciar();
    await esperar(20);

    await procesador?.detener();
    const llamadas = lote.llamadas;
    await esperar(100);

    expect(lote.enCurso).toBe(0);
    expect(lote.llamadas).toBe(llamadas);
    expect(cerrados()).toBe(1);
  });

  it('si el lote tarda más que la espera máxima, igual cierra y no se cuelga', async () => {
    const lote = new LoteFalso();
    lote.duracionEnMs = 500;
    const { cerrados } = crear(lote, { esperaAlApagarEnMs: 30 });
    procesador?.iniciar();
    await esperar(10);

    const inicio = Date.now();
    await procesador?.detener();

    expect(Date.now() - inicio).toBeLessThan(300);
    expect(cerrados()).toBe(1);
  });

  it('despertar después de detener no hace nada', async () => {
    const lote = new LoteFalso();
    crear(lote);
    procesador?.iniciar();
    await procesador?.detener();
    const llamadas = lote.llamadas;

    procesador?.despertar();
    await esperar(40);

    expect(lote.llamadas).toBe(llamadas);
  });
});
