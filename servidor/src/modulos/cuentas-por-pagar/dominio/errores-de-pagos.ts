import { ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** Un documento con pagos vigentes no se anula, elimina, desautoriza ni corrige: primero se anulan sus pagos. */
export class DocumentoConPagos extends ReglaDeNegocioInfringida {
  readonly codigo = 'documento_con_pagos';

  constructor(documento: string, pagos: readonly string[]) {
    const uno = pagos.length === 1;
    super(
      `El documento ${documento} tiene ${uno ? `el pago ${pagos[0]}` : `los pagos ${pagos.join(', ')}`}: ${
        uno ? 'anúlelo' : 'anúlelos'
      } primero.`,
    );
  }
}

/** Un documento que tuvo pagos en una contraseña (vigentes o anulados) no se quita de ella: la llave lo exige. */
export class DocumentoConPagosEnLaContrasena extends ReglaDeNegocioInfringida {
  readonly codigo = 'documento_con_pagos_en_la_contrasena';

  constructor(documento: string) {
    super(`El documento ${documento} tuvo pagos en esta contraseña: no se quita.`);
  }
}

/** Una contraseña con pagos vigentes no se anula: primero se anulan sus pagos. */
export class ContrasenaConPagos extends ReglaDeNegocioInfringida {
  readonly codigo = 'contrasena_con_pagos';

  constructor(contrasena: string) {
    super(`La contraseña ${contrasena} tiene pagos vigentes: anúlelos primero.`);
  }
}

/** Una nota con reintegros vigentes no se anula ni se elimina: primero se anulan sus reintegros. */
export class NotaConReintegros extends ReglaDeNegocioInfringida {
  readonly codigo = 'nota_con_reintegros';

  constructor(nota: string) {
    super(`La nota ${nota} tiene reintegros vigentes: anúlelos primero.`);
  }
}
