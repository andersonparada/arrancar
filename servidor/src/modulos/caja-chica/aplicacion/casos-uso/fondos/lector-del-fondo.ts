import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { CustodioDelFondo, Fondo } from '../../../dominio/fondos.js';
import type { FondoDto } from '../../dto/fondos.dto.js';
import { fichaDelFondo } from './armado-del-fondo.js';
import type { DependenciasDeFondos } from './dependencias-de-fondos.js';

type Dependencias = Pick<DependenciasDeFondos, 'fondos' | 'consultas'>;

/** El custodio vigente: el que no tiene `hasta`. */
export const custodioVigente = (custodios: readonly CustodioDelFondo[]): CustodioDelFondo | undefined =>
  custodios.find(({ hasta }) => hasta === null);

/** Arma la ficha de un fondo con lo que lee de la transacción en curso; la usan los casos de uso al responder. */
export class LectorDelFondo {
  constructor(private readonly dependencias: Dependencias) {}

  async leer(fondo: Fondo, avisos: readonly string[] = []): Promise<FondoDto> {
    const { fondos, consultas } = this.dependencias;
    const [custodios, cambios, lecturas, uso] = await Promise.all([
      fondos.custodios(fondo.id),
      fondos.cambios(fondo.id),
      consultas.datosDeLectura([fondo.id]),
      consultas.usoDelFondo(fondo.id),
    ]);
    const lectura = lecturas.get(fondo.id);
    if (!lectura) throw new RecursoNoEncontrado('El fondo');
    const sinUso = Object.values(uso).every((cantidad) => cantidad === 0);
    return fichaDelFondo({ fondo, lectura, custodios, cambios, sinUso, avisos });
  }

  /** El fondo bloqueado para este caso de uso. @throws RecursoNoEncontrado si no existe o no está al alcance. */
  async bloquear(fondoId: string): Promise<Fondo> {
    const fondo = await this.dependencias.fondos.bloquear(fondoId);
    if (!fondo) throw new RecursoNoEncontrado('El fondo');
    return fondo;
  }

  /** El fondo sin bloquearlo. @throws RecursoNoEncontrado si no existe o no está al alcance. */
  async buscar(fondoId: string): Promise<Fondo> {
    const fondo = await this.dependencias.fondos.buscar(fondoId);
    if (!fondo) throw new RecursoNoEncontrado('El fondo');
    return fondo;
  }
}
