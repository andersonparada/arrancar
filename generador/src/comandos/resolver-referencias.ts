import type { CampoDefinido, DefinicionDeRecurso } from '../definicion/definir-recurso.js';
import { ErrorDelGenerador } from '../definicion/errores.js';
import type { EscritorDeArchivos } from '../motor/escritor-de-archivos.js';
import { nombresDeCodigo } from '../nombres.js';

/** Trae una definición por su ruta `<modulo>/<entidad>`. */
export type Cargador = (ruta: string) => Promise<DefinicionDeRecurso>;

export class ReferenciaSinGenerar extends ErrorDelGenerador {
  constructor(ruta: string) {
    super(`"${ruta}" todavía no está generado. Genérelo antes con: npm run generar -- recurso ${ruta}`);
  }
}

export class ReferenciaFueraDelAlcance extends ErrorDelGenerador {
  constructor(campo: string) {
    super(
      `"${campo}" apunta a un recurso de cada empresa desde uno de toda la cuenta: las demás empresas no lo verían.`,
    );
  }
}

export class ReferenciaAOtroModulo extends ErrorDelGenerador {
  constructor(ruta: string, modulo: string) {
    super(`La definición en ${ruta} es del módulo "${modulo}": una referencia apunta a una entidad del mismo módulo.`);
  }
}

/**
 * Completa cada campo de referencia con la definición del recurso al que apunta
 * (y las de estos, en cadena), y comprueba que se pueda apuntar a él.
 */
export class ResolverReferencias {
  private readonly resueltas = new Map<string, Promise<DefinicionDeRecurso>>();

  constructor(
    private readonly escritor: EscritorDeArchivos,
    private readonly cargar: Cargador,
  ) {}

  async resolver(definicion: DefinicionDeRecurso): Promise<DefinicionDeRecurso> {
    const resuelta: DefinicionDeRecurso = { ...definicion, campos: [] };
    resuelta.campos = await Promise.all(definicion.campos.map((campo) => this.conReferida(campo, resuelta)));
    return resuelta;
  }

  private async conReferida(campo: CampoDefinido, definicion: DefinicionDeRecurso): Promise<CampoDefinido> {
    if (campo.campo.tipo !== 'referencia') return campo;
    if (campo.campo.entidad === definicion.entidad.pascal) return { ...campo, referida: definicion };
    const referida = await this.cargarReferida(definicion.modulo.clave, campo.campo.entidad);
    if (definicion.alcance === 'cuenta' && referida.alcance === 'empresa') {
      throw new ReferenciaFueraDelAlcance(campo.nombre.camel);
    }
    return { ...campo, referida };
  }

  /** Una vez por entidad, aunque varios campos o recursos apunten a ella. */
  private cargarReferida(modulo: string, entidad: string): Promise<DefinicionDeRecurso> {
    const ruta = `${modulo}/${nombresDeCodigo(entidad).clave}`;
    if (!this.resueltas.has(ruta)) this.resueltas.set(ruta, this.cargarYComprobar(ruta, modulo));
    return this.resueltas.get(ruta)!;
  }

  private async cargarYComprobar(ruta: string, modulo: string): Promise<DefinicionDeRecurso> {
    const referida = await this.cargar(ruta);
    if (referida.modulo.clave !== modulo) throw new ReferenciaAOtroModulo(ruta, referida.modulo.clave);
    const tablas = `servidor/src/modulos/${modulo}/infraestructura/persistencia/${referida.plural.clave}.tablas.ts`;
    if (!this.escritor.existe(tablas)) throw new ReferenciaSinGenerar(ruta);
    return this.resolver(referida);
  }
}
