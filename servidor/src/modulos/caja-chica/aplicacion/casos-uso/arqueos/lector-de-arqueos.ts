import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Arqueo } from '../../../dominio/arqueos.js';
import type { ArqueoDto } from '../../dto/arqueos.dto.js';
import { arqueoDto } from './armado-del-arqueo.js';
import type { DependenciasDeArqueos } from './dependencias-de-arqueos.js';

type Dependencias = Pick<DependenciasDeArqueos, 'arqueos' | 'comprobantes'>;

/** Arma la ficha de un arqueo con lo que lee de la transacción en curso; la usan los casos de uso al responder. */
export class LectorDeArqueos {
  constructor(private readonly dependencias: Dependencias) {}

  async leer(arqueo: Arqueo, avisos: readonly string[] = []): Promise<ArqueoDto> {
    const comprobante = await this.dependencias.comprobantes.delArqueo(arqueo.id);
    return arqueoDto({ arqueo, comprobante, avisos });
  }

  /** El arqueo sin bloquearlo. @throws RecursoNoEncontrado si no existe o su fondo no está al alcance. */
  async buscar(arqueoId: string): Promise<Arqueo> {
    const arqueo = await this.dependencias.arqueos.buscar(arqueoId);
    if (!arqueo) throw new RecursoNoEncontrado('El arqueo');
    return arqueo;
  }
}
