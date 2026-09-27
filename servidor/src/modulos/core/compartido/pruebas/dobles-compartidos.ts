import type { ContextoEmpresa } from '../aplicacion/contexto-empresa.js';
import type { Operador } from '../aplicacion/operador.js';
import type { PublicadorEventos } from '../aplicacion/publicador-eventos.js';
import type { UnidadDeTrabajo } from '../aplicacion/unidad-de-trabajo.js';
import type { EventoDominio } from '../dominio/evento-dominio.js';

/** Ejecuta el trabajo tal cual y recuerda con qué contexto se pidió, para comprobarlo en las pruebas. */
export class UnidadDeTrabajoEnMemoria implements UnidadDeTrabajo {
  readonly contextos: ContextoEmpresa[] = [];

  ejecutar<Resultado>(contexto: ContextoEmpresa, trabajo: () => Promise<Resultado>): Promise<Resultado> {
    this.contextos.push(contexto);
    return trabajo();
  }
}

/** Guarda los eventos publicados en vez de enviarlos. */
export class PublicadorEventosEnMemoria implements PublicadorEventos {
  readonly publicados: EventoDominio[] = [];

  async publicar(eventos: readonly EventoDominio[]): Promise<void> {
    this.publicados.push(...eventos);
  }

  nombres(): string[] {
    return this.publicados.map((evento) => evento.nombre);
  }
}

/** Operador de prueba: un propietario (sin superacceso) trabajando en su empresa. */
export function operadorDePrueba(cambios: Partial<Operador> = {}): Operador {
  return {
    usuarioId: crypto.randomUUID(),
    cuentaId: crypto.randomUUID(),
    empresaId: crypto.randomUUID(),
    esSuperacceso: false,
    ...cambios,
  };
}
