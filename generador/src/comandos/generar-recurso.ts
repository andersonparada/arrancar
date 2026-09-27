import type { DefinicionDeRecurso } from '../definicion/definir-recurso.js';
import { ErrorDelGenerador } from '../definicion/errores.js';
import type { EscritorDeArchivos } from '../motor/escritor-de-archivos.js';
import { GenerarRecursoEnServidor } from '../servidor/generar-recurso-en-servidor.js';

/** Trae la definición de `generador/definiciones/<modulo>/<entidad>.ts`. */
export type CargadorDeDefiniciones = (ruta: string) => Promise<DefinicionDeRecurso>;

export class RutaDeRecursoInvalida extends ErrorDelGenerador {
  constructor(ruta: string) {
    super(`"${ruta}" no sirve: escriba <modulo>/<entidad>, por ejemplo ganado/animal.`);
  }
}

export class ModuloInexistente extends ErrorDelGenerador {
  constructor(clave: string) {
    super(`No existe el módulo "${clave}". Créelo antes con: npm run generar -- modulo ${clave}`);
  }
}

export class DefinicionDeOtroModulo extends ErrorDelGenerador {
  constructor(ruta: string, modulo: string) {
    super(`La definición en ${ruta} dice que es del módulo "${modulo}": la carpeta y el módulo deben coincidir.`);
  }
}

/** El nombre que ve el usuario, tal como está en el `modulo.ts` del servidor. */
const nombreDelModulo = (codigo: string, clave: string) => /nombre: '([^']+)'/.exec(codigo)?.[1] ?? clave;

/** Genera todo lo de un recurso a partir de su definición, en un módulo que ya existe. */
export class GenerarRecurso {
  constructor(
    private readonly escritor: EscritorDeArchivos,
    private readonly cargar: CargadorDeDefiniciones,
  ) {}

  async ejecutar(ruta: string): Promise<DefinicionDeRecurso> {
    const [modulo, entidad, ...sobra] = ruta.split('/');
    if (!modulo || !entidad || sobra.length > 0) throw new RutaDeRecursoInvalida(ruta);
    const archivoDelModulo = `servidor/src/modulos/${modulo}/modulo.ts`;
    if (!this.escritor.existe(archivoDelModulo)) throw new ModuloInexistente(modulo);
    const definicion = await this.cargar(ruta);
    if (definicion.modulo.clave !== modulo) throw new DefinicionDeOtroModulo(ruta, definicion.modulo.clave);

    const nombre = nombreDelModulo(this.escritor.leer(archivoDelModulo), modulo);
    new GenerarRecursoEnServidor(this.escritor).ejecutar(definicion, nombre);
    return definicion;
  }
}
