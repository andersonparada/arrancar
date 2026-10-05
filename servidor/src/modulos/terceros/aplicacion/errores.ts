import { RecursoDuplicado } from '../../core/compartido/aplicacion/errores.js';
import type { TerceroParecidoDto } from './dto/tercero.dto.js';

/** El NIT que se quiere poner ya es de otro tercero de la cuenta. */
export class NitYaRegistrado extends RecursoDuplicado {
  override readonly codigo = 'nit_ya_registrado';

  constructor(nombreDelOtro: string) {
    super(`Ese NIT ya está registrado para ${nombreDelOtro}.`);
  }
}

/** Aviso antes de registrar a alguien dos veces; el usuario puede confirmar y guardarlo igual. */
export class HayTercerosParecidos extends RecursoDuplicado {
  constructor(parecidos: TerceroParecidoDto[]) {
    super('Ya hay alguien registrado con datos parecidos; confirme para guardarlo de todas formas.', {
      duplicados: parecidos,
    });
  }
}
