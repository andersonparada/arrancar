import { describe, expect, it } from 'vitest';
import type { TurnoDeRevision } from '../../aplicacion/puertos/inspector-de-pdf.js';
import { PdfNoSePudoRevisar, RevisionDePdfSaturada } from '../../dominio/documento.js';
import { FilaDeRevision, LIMITES_DE_LA_FILA, type Temporizador } from './fila-de-revision.js';

/** Reloj de mentira: los plazos solo vencen cuando la prueba lo manda. */
class RelojFalso {
  private readonly pendientes = new Set<{ accion: () => void }>();
  private readonly creados: { accion: () => void }[] = [];

  readonly temporizador: Temporizador = (accion) => {
    const plazo = { accion };
    this.pendientes.add(plazo);
    this.creados.push(plazo);
    return () => this.pendientes.delete(plazo);
  };

  /** Hace pasar el plazo del enésimo turno que tuvo que esperar (empezando en 0), si sigue esperando. */
  vencerPlazo(posicion: number): void {
    const plazo = this.creados[posicion]!;
    if (this.pendientes.delete(plazo)) plazo.accion();
  }

  /** Hace pasar el plazo de todo lo que sigue esperando. */
  vencerPlazos(): void {
    for (const plazo of [...this.pendientes]) {
      this.pendientes.delete(plazo);
      plazo.accion();
    }
  }
}

/** Una tarea que no termina hasta que la prueba la suelta. */
function tareaPausada(orden: string[], nombre: string) {
  let soltar!: () => void;
  const pausa = new Promise<void>((resolver) => (soltar = resolver));
  const tarea = async () => {
    orden.push(nombre);
    await pausa;
    return nombre;
  };
  return { tarea, soltar };
}

const usuario = (cuentaId: string): TurnoDeRevision => ({ cuentaId, origen: 'usuario' });
const sistema: TurnoDeRevision = { cuentaId: 'c-sistema', origen: 'sistema' };
const motivoDe = async (promesa: Promise<unknown>) => {
  const error = await promesa.catch((falla: unknown) => falla);
  expect(error).toBeInstanceOf(RevisionDePdfSaturada);
  return ((error as RevisionDePdfSaturada).detalles as { motivo: string }).motivo;
};
const asentar = () => new Promise((resolver) => setImmediate(resolver));

function armar() {
  const reloj = new RelojFalso();
  return { fila: new FilaDeRevision(reloj.temporizador), reloj, orden: [] as string[] };
}

describe('fila de revisión', () => {
  it('corre de a una, en orden de llegada', async () => {
    const { fila, orden } = armar();
    const [a, b, c] = ['a', 'b', 'c'].map((n) => tareaPausada(orden, n));
    const resultados = [
      fila.ejecutar(usuario('1'), a!.tarea),
      fila.ejecutar(usuario('2'), b!.tarea),
      fila.ejecutar(usuario('3'), c!.tarea),
    ];
    await asentar();
    expect(orden).toEqual(['a']);
    a!.soltar();
    await asentar();
    expect(orden).toEqual(['a', 'b']);
    b!.soltar();
    c!.soltar();
    expect(await Promise.all(resultados)).toEqual(['a', 'b', 'c']);
    expect(orden).toEqual(['a', 'b', 'c']);
  });

  it('el sistema pasa delante de los usuarios que esperan, y entre sistemas va en orden de llegada', async () => {
    const { fila, orden } = armar();
    const [primera, u1, s1, s2] = ['primera', 'u1', 's1', 's2'].map((n) => tareaPausada(orden, n));
    const todos = [
      fila.ejecutar(usuario('1'), primera!.tarea),
      fila.ejecutar(usuario('2'), u1!.tarea),
      fila.ejecutar(sistema, s1!.tarea),
      fila.ejecutar(sistema, s2!.tarea),
    ];
    for (const t of [primera, s1, s2, u1]) {
      await asentar();
      t!.soltar();
    }
    await Promise.all(todos);
    expect(orden).toEqual(['primera', 's1', 's2', 'u1']);
  });

  it('rechaza al usuario número 11 que espera, con fila_llena', async () => {
    const { fila, orden } = armar();
    const corriendo = tareaPausada(orden, 'corre');
    const todos = [fila.ejecutar(usuario('c0'), corriendo.tarea)];
    for (let i = 1; i <= LIMITES_DE_LA_FILA.enEsperaDeUsuarios; i++)
      todos.push(fila.ejecutar(usuario(`c${i}`), async () => 'ok'));
    expect(await motivoDe(fila.ejecutar(usuario('otra'), async () => 'no'))).toBe('fila_llena');
    corriendo.soltar();
    await Promise.all(todos);
  });

  it('rechaza la tercera de una cuenta con cuenta_al_tope y deja entrar a otra cuenta', async () => {
    const { fila, orden } = armar();
    const primera = tareaPausada(orden, 'a1');
    const todos = [fila.ejecutar(usuario('a'), primera.tarea), fila.ejecutar(usuario('a'), async () => 'a2')];
    expect(await motivoDe(fila.ejecutar(usuario('a'), async () => 'a3'))).toBe('cuenta_al_tope');
    todos.push(fila.ejecutar(usuario('b'), async () => 'b1'));
    primera.soltar();
    expect(await Promise.all(todos)).toEqual(['a1', 'a2', 'b1']);
  });

  it('a los 60 s sale con espera_agotada y su lugar queda libre', async () => {
    const { fila, reloj, orden } = armar();
    const corriendo = tareaPausada(orden, 'corre');
    const activa = fila.ejecutar(usuario('x'), corriendo.tarea);
    const impaciente = fila.ejecutar(usuario('y'), async () => 'nunca');
    reloj.vencerPlazos();
    expect(await motivoDe(impaciente)).toBe('espera_agotada');
    // Su cuenta quedó libre: puede volver a pedir dos turnos.
    const siguientes = [fila.ejecutar(usuario('y'), async () => 'y1'), fila.ejecutar(usuario('y'), async () => 'y2')];
    corriendo.soltar();
    expect(await Promise.all([activa, ...siguientes])).toEqual(['corre', 'y1', 'y2']);
  });

  it('un turno del sistema que espera demasiado falla con PdfNoSePudoRevisar', async () => {
    const { fila, reloj, orden } = armar();
    const corriendo = tareaPausada(orden, 'corre');
    const activa = fila.ejecutar(usuario('x'), corriendo.tarea);
    const delSistema = fila.ejecutar(sistema, async () => 'nunca');
    reloj.vencerPlazos();
    await expect(delSistema).rejects.toBeInstanceOf(PdfNoSePudoRevisar);
    corriendo.soltar();
    await activa;
  });

  it('una tarea que falla libera el turno y descuenta la cuenta', async () => {
    const { fila } = armar();
    for (let vez = 0; vez < LIMITES_DE_LA_FILA.porCuenta + 1; vez++) {
      await expect(
        fila.ejecutar(usuario('a'), async () => {
          throw new Error('qpdf falló');
        }),
      ).rejects.toThrow('qpdf falló');
    }
    expect(await fila.ejecutar(usuario('a'), async () => 'sigue')).toBe('sigue');
  });

  it('el sistema no cuenta para los topes de la cuenta ni de la fila', async () => {
    const { fila, orden } = armar();
    const corriendo = tareaPausada(orden, 'corre');
    const todos = [fila.ejecutar(usuario('a'), corriendo.tarea)];
    for (let i = 0; i < LIMITES_DE_LA_FILA.enEsperaDelSistema; i++)
      todos.push(fila.ejecutar({ cuentaId: 'a', origen: 'sistema' }, async () => `s${i}`));
    todos.push(fila.ejecutar(usuario('a'), async () => 'a2'));
    for (let i = 1; i < LIMITES_DE_LA_FILA.enEsperaDeUsuarios; i++)
      todos.push(fila.ejecutar(usuario(`c${i}`), async () => 'ok'));
    corriendo.soltar();
    expect(await Promise.all(todos)).toHaveLength(todos.length);
  });

  it('el sexto turno del sistema en espera falla con PdfNoSePudoRevisar, y tiene prioridad', async () => {
    const { fila, orden } = armar();
    const corriendo = tareaPausada(orden, 'corre');
    const todos = [fila.ejecutar(usuario('a'), corriendo.tarea)];
    todos.push(fila.ejecutar(usuario('b'), async () => 'u'));
    for (let i = 0; i < LIMITES_DE_LA_FILA.enEsperaDelSistema; i++)
      todos.push(fila.ejecutar(sistema, async () => (orden.push(`s${i}`), `s${i}`)));
    await expect(fila.ejecutar(sistema, async () => 'sexto')).rejects.toBeInstanceOf(PdfNoSePudoRevisar);
    corriendo.soltar();
    await Promise.all(todos);
    expect(orden).toEqual(['corre', 's0', 's1', 's2', 's3', 's4']);
  });

  it('si a uno de en medio se le agota la espera, los de atrás siguen en orden y todos reciben turno', async () => {
    const { fila, reloj, orden } = armar();
    const corriendo = tareaPausada(orden, 'corre');
    const activa = fila.ejecutar(usuario('x'), corriendo.tarea);
    const registrar = (nombre: string) => async () => (orden.push(nombre), nombre);
    const primero = fila.ejecutar(usuario('a'), registrar('primero'));
    const deEnMedio = fila.ejecutar(usuario('b'), registrar('nunca'));
    const ultimo = fila.ejecutar(usuario('c'), registrar('ultimo'));
    reloj.vencerPlazo(1);
    await expect(deEnMedio).rejects.toBeInstanceOf(RevisionDePdfSaturada);
    corriendo.soltar();
    expect(await Promise.all([activa, primero, ultimo])).toEqual(['corre', 'primero', 'ultimo']);
    expect(orden).toEqual(['corre', 'primero', 'ultimo']);
  });
});
