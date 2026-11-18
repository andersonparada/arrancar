import { DatoInvalido } from '../../compartido/dominio/errores.js';

/** La dirección no sirve para enviar: se rechaza antes de entregarla al servidor de correo. */
export class DireccionNoUtilizable extends DatoInvalido {
  readonly codigo = 'direccion_no_utilizable';

  constructor() {
    super('El correo no se puede usar para enviar: revise que sea una dirección sencilla, como nombre@dominio.com.');
  }
}

/** La plantilla usa un marcador que el tipo de correo no ofrece. */
export class MarcadorDesconocido extends DatoInvalido {
  readonly codigo = 'marcador_desconocido';

  constructor(marcador: string, permitidos: readonly string[]) {
    super(`El marcador {${marcador}} no existe. Los permitidos son: ${permitidos.map((m) => `{${m}}`).join(', ')}.`, {
      marcador,
      permitidos,
    });
  }
}
