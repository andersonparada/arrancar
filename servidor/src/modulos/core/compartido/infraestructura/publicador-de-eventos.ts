import type { AvisadorDeEventosRegistrados } from '../aplicacion/avisador-de-eventos-registrados.js';
import type { PublicadorEventos } from '../aplicacion/publicador-eventos.js';
import type { EventoDominio } from '../dominio/evento-dominio.js';
import { registroDeEventos } from './persistencia/registro-de-eventos.tablas.js';
import {
  contextoEnCurso,
  despuesDeConfirmar,
  hayUnidadDeTrabajoEnCurso,
  transaccionEnCurso,
} from './unidad-de-trabajo-postgres.js';

/** Error de programación: se publicó un evento sin una unidad de trabajo en curso, así que no quedaría en el registro. */
export class PublicacionFueraDeLaTransaccion extends Error {
  constructor() {
    super('Los eventos se publican dentro de la unidad de trabajo del hecho que los causa, no fuera de ella.');
  }
}

/**
 * Publica los eventos **dentro** de la transacción del hecho: los guarda en `core.registro_de_eventos` (si la
 * transacción se deshace, no quedan), avisa `core.eventos_registrados` a los módulos interesados y deja el bus
 * en memoria para cuando se confirme. Fuera de una unidad de trabajo lanza `PublicacionFueraDeLaTransaccion`.
 */
export class PublicadorDeEventos implements PublicadorEventos {
  constructor(
    private readonly bus: PublicadorEventos,
    private readonly avisador: AvisadorDeEventosRegistrados,
  ) {}

  async publicar(eventos: readonly EventoDominio[]): Promise<void> {
    if (!hayUnidadDeTrabajoEnCurso()) throw new PublicacionFueraDeLaTransaccion();
    if (eventos.length === 0) return;
    await transaccionEnCurso()
      .insert(registroDeEventos)
      .values(
        eventos.map((evento) => ({
          id: evento.id,
          nombre: evento.nombre,
          version: evento.version,
          datos: evento.datos,
          ocurridoEn: evento.ocurridoEn,
        })),
      );
    await this.avisador.eventosRegistrados(contextoEnCurso(), eventos);
    despuesDeConfirmar(() => this.bus.publicar(eventos), 'eventos en el bus');
  }
}
