import type { AvisadorDeEventosRegistrados } from '../aplicacion/avisador-de-eventos-registrados.js';
import type { ContextoEmpresa } from '../aplicacion/contexto-empresa.js';
import type { Mediador } from '../../mediador/aplicacion/mediador.js';
import '../../contratos/core.contratos.js';
import type { EventoDominio } from '../dominio/evento-dominio.js';

/**
 * Avisa por el mediador `core.eventos_registrados`; lo escuchan solo los módulos activos en la cuenta. El operador
 * no es de superacceso: el aviso trabaja con la empresa y el usuario de la transacción.
 */
export class AvisadorDeEventosEnMediador implements AvisadorDeEventosRegistrados {
  constructor(private readonly mediador: Pick<Mediador, 'avisar'>) {}

  eventosRegistrados(contexto: ContextoEmpresa, eventos: readonly EventoDominio[]): Promise<void> {
    const registrados = eventos.map(({ id, nombre, version, datos, ocurridoEn }) => ({
      id,
      nombre,
      version,
      datos,
      ocurridoEn,
    }));
    return this.mediador.avisar({ ...contexto, esSuperacceso: false }, 'core.eventos_registrados', {
      eventos: registrados,
    });
  }
}
