import { ErrorDelGenerador } from '../definicion/errores.js';
import type { EscritorDeArchivos } from '../motor/escritor-de-archivos.js';
import { leerPlantilla, rellenar } from '../motor/plantillas.js';
import { FORMA_DE_CLAVE, nombresDeClave } from '../nombres.js';

/** El plural en español de una palabra: vaca → vacas, potrero → potreros, lote → lotes, luz → luces, corral → corrales. */
export function pluralDe(palabra: string): string {
  if (/[aeiouáéó]$/.test(palabra)) return `${palabra}s`;
  if (palabra.endsWith('z')) return `${palabra.slice(0, -1)}ces`;
  return `${palabra}es`;
}

export class DefinicionInvalidaDeRuta extends ErrorDelGenerador {
  constructor(ruta: string) {
    super(`"${ruta}" no sirve: escriba <modulo>/<entidad> en minúsculas con guiones, por ejemplo ganado/animal.`);
  }
}

/**
 * Crea `generador/definiciones/<modulo>/<entidad>.ts` con una definición de
 * ejemplo para completar. El plural en varias palabras cambia solo la primera:
 * categoria-de-proveedor → CategoriasDeProveedor.
 */
export class CrearDefinicion {
  constructor(
    private readonly escritor: EscritorDeArchivos,
    private readonly plantilla: (ruta: string) => string = leerPlantilla,
  ) {}

  ejecutar(ruta: string): string {
    const [modulo = '', entidad = ''] = ruta.split('/');
    if (!FORMA_DE_CLAVE.test(modulo) || !FORMA_DE_CLAVE.test(entidad)) throw new DefinicionInvalidaDeRuta(ruta);
    const [primera = '', ...resto] = entidad.split('-');
    const plural = nombresDeClave([pluralDe(primera), ...resto].join('-'));
    const nombres = nombresDeClave(entidad);
    const destino = `generador/definiciones/${modulo}/${entidad}.ts`;
    this.escritor.crear(
      destino,
      rellenar(this.plantilla('recurso/definicion.ts'), {
        moduloClave: modulo,
        entidadClave: entidad,
        Entidad: nombres.pascal,
        Singular: nombres.legible,
        singular: nombres.legible.toLowerCase(),
        Plural: plural.pascal,
        pluralTexto: plural.legible.toLowerCase(),
      }),
    );
    return destino;
  }
}
