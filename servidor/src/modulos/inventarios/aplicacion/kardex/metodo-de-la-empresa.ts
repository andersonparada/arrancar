import { randomUUID } from 'node:crypto';
import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type { MetodoDeCosteo } from '../../dominio/costeo/tipos.js';
import type { LectorDelMetodoInicial } from '../puertos/entorno-del-kardex.js';
import type { MetodoGuardado, RepositorioDeMetodos } from '../puertos/repositorio-de-metodos.js';

/** La primera fila de la historia rige desde antes de cualquier movimiento posible; un cambio trae su propio `desde`. */
export const DESDE_DEL_PRIMER_METODO = '2000-01-01';

/** El método de un día: la fila de mayor `desde` que no pase de ese día (la más antigua si el día es anterior a todas). */
export function metodoDelDia(historia: readonly MetodoGuardado[], fecha: string): MetodoGuardado | null {
  const ordenada = [...historia].sort((a, b) => b.desde.localeCompare(a.desde));
  return ordenada.find((fila) => fila.desde <= fecha) ?? ordenada.at(-1) ?? null;
}

interface Dependencias {
  metodos: RepositorioDeMetodos;
  metodoInicial: LectorDelMetodoInicial;
}

/** La historia del método de costeo de la empresa y su fijación con el primer movimiento (§3.3). */
export class MetodoDeLaEmpresa {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * El método que rige en `fecha` para un movimiento que se va a guardar. Si nadie lo eligió, crea la primera fila con
   * `inventarios.costeo.metodo_inicial`; con el primer movimiento lo marca como fijado: desde ahí no se edita.
   */
  async usarParaMover(operador: Operador, fecha: string): Promise<MetodoDeCosteo> {
    const { metodos, metodoInicial } = this.dependencias;
    const historia = await metodos.listar();
    const fila = metodoDelDia(historia, fecha) ?? (await this.crearPrimera(await metodoInicial.paraEmpresa(operador)));
    if (!fila.fijadoEn) await metodos.fijar(fila.id, new Date());
    return fila.metodo;
  }

  private async crearPrimera(metodo: MetodoDeCosteo): Promise<MetodoGuardado> {
    const fila: MetodoGuardado = {
      id: randomUUID(),
      metodo,
      desde: DESDE_DEL_PRIMER_METODO,
      fijadoEn: null,
      autorizacionSatNumero: null,
      autorizacionSatFecha: null,
      motivo: null,
    };
    await this.dependencias.metodos.agregar(fila);
    return fila;
  }
}
