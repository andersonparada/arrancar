import type { TurnoDeRevision } from '../../aplicacion/puertos/inspector-de-pdf.js';
import { PdfNoSePudoRevisar, RevisionDePdfSaturada } from '../../dominio/documento.js';

/** Constantes de seguridad, no configurables. */
export const LIMITES_DE_LA_FILA = {
  /** Turnos de usuario que pueden esperar a la vez. */
  enEsperaDeUsuarios: 10,
  /** Turnos de usuario (esperando o en revisión) por cuenta. */
  porCuenta: 2,
  esperaMaximaEnMs: 60_000,
} as const;

/** Programa `accion` dentro de `ms` y devuelve cómo cancelarla (se inyecta para las pruebas). */
export type Temporizador = (accion: () => void, ms: number) => () => void;

const temporizadorReal: Temporizador = (accion, ms) => {
  const reloj = setTimeout(accion, ms);
  return () => clearTimeout(reloj);
};

interface Espera {
  turno: TurnoDeRevision;
  pasar: () => void;
}

/**
 * Fila de revisión de PDF: corre una revisión a la vez. Los turnos de `usuario` tienen tope (10 en espera,
 * 2 por cuenta, 60 s de espera); los del `sistema` pasan delante y no cuentan para los topes. Nunca
 * interrumpe la revisión que ya corre.
 */
export class FilaDeRevision {
  private ocupada = false;
  private readonly esperando: Espera[] = [];
  private readonly turnosDeUsuarioPorCuenta = new Map<string, number>();

  constructor(private readonly temporizador: Temporizador = temporizadorReal) {}

  /**
   * @throws RevisionDePdfSaturada si un turno de usuario no cabe o espera demasiado.
   * @throws PdfNoSePudoRevisar si un turno del sistema espera demasiado.
   */
  async ejecutar<Resultado>(turno: TurnoDeRevision, tarea: () => Promise<Resultado>): Promise<Resultado> {
    this.admitir(turno);
    try {
      await this.esperarTurno(turno);
    } catch (error) {
      this.descontar(turno);
      throw error;
    }
    try {
      return await tarea();
    } finally {
      this.descontar(turno);
      this.pasarAlSiguiente();
    }
  }

  /** Rechaza enseguida al usuario que no cabe; si cabe, lo anota en su cuenta. */
  private admitir(turno: TurnoDeRevision): void {
    if (turno.origen === 'sistema') return;
    const deLaCuenta = this.turnosDeUsuarioPorCuenta.get(turno.cuentaId) ?? 0;
    if (deLaCuenta >= LIMITES_DE_LA_FILA.porCuenta) throw new RevisionDePdfSaturada('cuenta_al_tope');
    const tendraQueEsperar = this.ocupada || this.esperando.length > 0;
    if (tendraQueEsperar && this.usuariosEsperando() >= LIMITES_DE_LA_FILA.enEsperaDeUsuarios)
      throw new RevisionDePdfSaturada('fila_llena');
    this.turnosDeUsuarioPorCuenta.set(turno.cuentaId, deLaCuenta + 1);
  }

  private descontar(turno: TurnoDeRevision): void {
    if (turno.origen === 'sistema') return;
    const quedan = (this.turnosDeUsuarioPorCuenta.get(turno.cuentaId) ?? 1) - 1;
    if (quedan > 0) this.turnosDeUsuarioPorCuenta.set(turno.cuentaId, quedan);
    else this.turnosDeUsuarioPorCuenta.delete(turno.cuentaId);
  }

  private usuariosEsperando(): number {
    return this.esperando.filter((espera) => espera.turno.origen === 'usuario').length;
  }

  private esperarTurno(turno: TurnoDeRevision): Promise<void> {
    if (!this.ocupada && this.esperando.length === 0) {
      this.ocupada = true;
      return Promise.resolve();
    }
    return new Promise<void>((resolver, rechazar) => {
      const cancelarEspera = this.temporizador(() => {
        this.esperando.splice(this.esperando.indexOf(espera), 1);
        rechazar(errorDeEsperaAgotada(turno));
      }, LIMITES_DE_LA_FILA.esperaMaximaEnMs);
      const espera: Espera = {
        turno,
        pasar: () => {
          cancelarEspera();
          resolver();
        },
      };
      this.esperando.splice(this.posicionPara(turno), 0, espera);
    });
  }

  /** El sistema va detrás del último del sistema que espera; el usuario, al final. */
  private posicionPara(turno: TurnoDeRevision): number {
    if (turno.origen === 'usuario') return this.esperando.length;
    const primerUsuario = this.esperando.findIndex((espera) => espera.turno.origen === 'usuario');
    return primerUsuario === -1 ? this.esperando.length : primerUsuario;
  }

  private pasarAlSiguiente(): void {
    const siguiente = this.esperando.shift();
    if (siguiente) siguiente.pasar();
    else this.ocupada = false;
  }
}

function errorDeEsperaAgotada(turno: TurnoDeRevision): Error {
  return turno.origen === 'sistema' ? new PdfNoSePudoRevisar() : new RevisionDePdfSaturada('espera_agotada');
}
