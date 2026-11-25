import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import '../../core/contratos/contabilidad.contratos.js';
import type { LlaveDeEnlace, RolDeCuenta } from '../../core/contratos/contabilidad.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import type { LlavesDeEnlaceDeLosModulos } from '../aplicacion/puertos/enlaces.js';

/** Pregunta a todos los módulos activos; cada uno ofrece las llaves de lo suyo y los demás no responden. */
export class LlavesDeEnlaceEnMediador implements LlavesDeEnlaceDeLosModulos {
  async de(operador: Operador, rol: RolDeCuenta): Promise<LlaveDeEnlace[]> {
    const respuestas = await mediador.preguntarATodos(operador, 'contabilidad.llaves_de_enlace', { rol });
    return respuestas.flatMap(({ respuesta }) => respuesta);
  }
}
