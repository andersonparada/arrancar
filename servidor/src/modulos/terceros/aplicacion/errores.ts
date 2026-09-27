import { RecursoDuplicado } from '../../core/compartido/aplicacion/errores.js';
import type { TerceroParecidoDto } from './dto/tercero.dto.js';

/** Aviso antes de registrar a alguien dos veces; el usuario puede confirmar y guardarlo igual. */
export class HayTercerosParecidos extends RecursoDuplicado {
  constructor(parecidos: TerceroParecidoDto[]) {
    super('Ya hay alguien registrado con datos parecidos; confirme para guardarlo de todas formas.', {
      duplicados: parecidos,
    });
  }
}
