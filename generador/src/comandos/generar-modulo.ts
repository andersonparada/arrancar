import { ErrorDelGenerador } from '../definicion/errores.js';
import type { EscritorDeArchivos } from '../motor/escritor-de-archivos.js';
import { leerPlantilla, rellenar } from '../motor/plantillas.js';
import { FORMA_DE_CLAVE, nombresDeClave } from '../nombres.js';

export interface OpcionesDeModulo {
  clave: string;
  /** Lo que ve el usuario en el menú; por omisión, la clave con mayúscula. */
  nombre?: string;
  descripcion?: string;
  /** Un ícono de lucide-vue-next para el grupo del menú. */
  icono?: string;
  /** La fecha que se anota en el documento del módulo (aaaa-mm-dd). */
  fecha: string;
}

/** Cada plantilla del módulo y dónde queda, con `{{clave}}` en la ruta. */
const ARCHIVOS_DEL_MODULO: [plantilla: string, destino: string][] = [
  ['modulo/servidor-modulo.ts', 'servidor/src/modulos/{{clave}}/modulo.ts'],
  ['modulo/cliente-modulo.ts', 'cliente/src/modulos/{{clave}}/modulo.ts'],
  ['modulo/cliente-textos.ts', 'cliente/src/modulos/{{clave}}/textos.ts'],
  ['modulo/documento.md', 'docs/modulos/{{clave}}.md'],
];

const ICONO_PREDETERMINADO = 'Boxes';

/** Los textos van entre comillas simples en el código generado. */
const entreComillas = (texto: string) => texto.replaceAll('\\', '\\\\').replaceAll("'", "\\'");

export class ClaveDeModuloInvalida extends ErrorDelGenerador {
  constructor(clave: string) {
    super(`La clave "${clave}" no sirve: use minúsculas, números y guiones (p. ej. ganado o moneda-extranjera).`);
  }
}

export class ModuloExistente extends ErrorDelGenerador {
  constructor(clave: string) {
    super(`El módulo "${clave}" ya existe. Para agregarle algo, genere un recurso.`);
  }
}

function valoresDelModulo({ clave, nombre, descripcion, icono, fecha }: OpcionesDeModulo): Record<string, string> {
  const nombres = nombresDeClave(clave);
  const visible = nombre ?? nombres.legible;
  return {
    clave,
    Pascal: nombres.pascal,
    CONSTANTE: nombres.constante,
    serpiente: nombres.serpiente,
    nombre: entreComillas(visible),
    descripcion: entreComillas(descripcion ?? `Módulo ${visible}.`),
    icono: icono ?? ICONO_PREDETERMINADO,
    fecha,
  };
}

/**
 * Crea el esqueleto de un módulo en el servidor y en el cliente, su documento y
 * lo registra en los dos `modulos/indice.ts`. No trae recursos: se agregan con
 * `generar recurso`.
 */
export class GenerarModulo {
  constructor(
    private readonly escritor: EscritorDeArchivos,
    private readonly plantilla: (ruta: string) => string = leerPlantilla,
  ) {}

  ejecutar(opciones: OpcionesDeModulo): void {
    const { clave } = opciones;
    if (!FORMA_DE_CLAVE.test(clave)) throw new ClaveDeModuloInvalida(clave);
    if (this.escritor.existe(`servidor/src/modulos/${clave}/modulo.ts`)) throw new ModuloExistente(clave);
    const valores = valoresDelModulo(opciones);
    const archivos = ARCHIVOS_DEL_MODULO.map(([plantilla, destino]) => [
      rellenar(destino, valores),
      rellenar(this.plantilla(plantilla), valores),
    ]);
    for (const [destino, contenido] of archivos) this.escritor.crear(destino!, contenido!);
    this.registrar(valores);
  }

  private registrar({ clave, Pascal }: Record<string, string>): void {
    const modulo = `modulo${Pascal}`;
    this.escritor.insertarEnMarca('servidor/src/modulos/indice.ts', 'importaciones', [
      `import { ${modulo} } from './${clave}/modulo.js';`,
    ]);
    this.escritor.insertarEnMarca('servidor/src/modulos/indice.ts', 'modulos', [`${modulo},`]);
    this.escritor.insertarEnMarca('cliente/src/modulos/indice.ts', 'importaciones', [
      `import { ${modulo} } from './${clave}/modulo';`,
    ]);
    this.escritor.insertarEnMarca('cliente/src/modulos/indice.ts', 'modulos', [`${modulo},`]);
  }
}
