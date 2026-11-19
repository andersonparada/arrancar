import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** Ningún proveedor de la cuenta tiene ese NIT (o ese nombre, si la fila no trae NIT). */
export class ProveedorDelPlazoNoExiste extends DatoInvalido {
  readonly codigo = 'proveedor_del_plazo_no_existe';

  constructor(campo: 'nit' | 'proveedorNombre', mensaje: string) {
    super(mensaje, { campo });
  }
}

/** Dos proveedores de la cuenta se llaman igual: sin NIT no se sabe a cuál se refiere la fila. */
export class ProveedorDelPlazoAmbiguo extends ReglaDeNegocioInfringida {
  readonly codigo = 'proveedor_del_plazo_ambiguo';

  constructor(nombre: string) {
    super(`Hay varios proveedores llamados «${nombre}»: escriba el NIT para saber cuál es.`, {
      campo: 'proveedorNombre',
    });
  }
}

/** El mismo proveedor aparece dos veces en el archivo: no se sabe cuál plazo debe quedar. */
export class ProveedorRepetidoEnElArchivo extends ReglaDeNegocioInfringida {
  readonly codigo = 'proveedor_repetido_en_el_archivo';

  constructor(campo: 'nit' | 'proveedorNombre') {
    super('Este proveedor ya aparece en otra fila del archivo.', { campo });
  }
}
