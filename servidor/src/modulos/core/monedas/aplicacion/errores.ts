import { RecursoDuplicado } from '../../compartido/aplicacion/errores.js';
import { DemasiadasSolicitudes } from '../../compartido/dominio/errores.js';

/** Otra moneda ya tiene ese código del Banguat. */
export class CodigoDelBanguatEnUso extends RecursoDuplicado {
  override readonly codigo = 'codigo_del_banguat_en_uso';

  constructor(codigo: number, moneda: string) {
    super(`El código ${codigo} del Banguat ya es de ${moneda}.`, { moneda });
  }
}

/** Otra vuelta de carga (o la actualización de la lista) está corriendo: se espera a que termine. */
export class CargaDelBanguatEnCurso extends RecursoDuplicado {
  override readonly codigo = 'carga_del_banguat_en_curso';

  constructor() {
    super('Ya hay una carga del Banguat en curso; intente de nuevo en un momento.');
  }
}

/** La moneda ya tiene tipos cargados con otro código: cambiarlo mezclaría dos series. */
export class CodigoDelBanguatConOtraSerie extends RecursoDuplicado {
  override readonly codigo = 'codigo_del_banguat_con_otra_serie';

  constructor(moneda: string, codigoDeLaSerie: number) {
    super(`${moneda} ya tiene tipos de cambio cargados con el código ${codigoDeLaSerie} del Banguat.`, {
      moneda,
      codigoDeLaSerie,
    });
  }
}

/** La muestra sale a un servicio externo: se limita por usuario. */
export class DemasiadasMuestrasDelBanguat extends DemasiadasSolicitudes {
  readonly codigo = 'demasiadas_muestras_del_banguat';

  constructor() {
    super('Pidió demasiadas muestras del Banguat en poco tiempo. Espere un minuto e inténtelo de nuevo.');
  }
}
