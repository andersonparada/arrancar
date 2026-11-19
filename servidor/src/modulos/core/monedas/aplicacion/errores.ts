import { RecursoDuplicado } from '../../compartido/aplicacion/errores.js';

/** Otra moneda ya tiene ese código del Banguat. */
export class CodigoDelBanguatEnUso extends RecursoDuplicado {
  override readonly codigo = 'codigo_del_banguat_en_uso';

  constructor(codigo: number, moneda: string) {
    super(`El código ${codigo} del Banguat ya es de ${moneda}.`, { moneda });
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
