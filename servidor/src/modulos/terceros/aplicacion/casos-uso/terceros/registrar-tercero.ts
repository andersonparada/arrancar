import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Tercero } from '../../../dominio/tercero.js';
import type { AvisoDeParecidos } from '../../aviso-de-parecidos.js';
import { datosDeTercero } from '../../conversiones.js';
import type { SolicitudDeTercero, TerceroDto } from '../../dto/tercero.dto.js';
import type { ConsultasTerceros } from '../../puertos/consultas.js';
import type { RepositorioTerceros } from '../../puertos/repositorios.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioTerceros;
  consultas: ConsultasTerceros;
  avisoDeParecidos: AvisoDeParecidos;
  publicadorEventos: PublicadorEventos;
}

export class RegistrarTercero {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws HayTercerosParecidos si se parece a otro y no se confirmó. */
  async ejecutar(operador: Operador, solicitud: SolicitudDeTercero): Promise<TerceroDto> {
    const { unidadDeTrabajo, repositorio, consultas, avisoDeParecidos, publicadorEventos } = this.dependencias;
    const tercero = Tercero.registrar(Identificador.desde(operador.cuentaId), datosDeTercero(solicitud));

    const registrado = await unidadDeTrabajo.ejecutar(operador, async () => {
      await avisoDeParecidos.exigirQueNoHaya(tercero, solicitud.confirmarDuplicado);
      await repositorio.agregar(tercero);
      return consultas.obtener(tercero.id.valor);
    });
    await publicadorEventos.publicar(tercero.extraerEventos());
    return registrado;
  }
}
