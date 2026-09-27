import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Contacto } from '../../../dominio/contacto.js';
import { Tercero } from '../../../dominio/tercero.js';
import type { AvisoDeParecidos } from '../../aviso-de-parecidos.js';
import { datosDeContacto, datosDeTercero } from '../../conversiones.js';
import type { SolicitudDeContacto } from '../../dto/contacto.dto.js';
import type { SolicitudDeAltaDeTercero, TerceroDto } from '../../dto/tercero.dto.js';
import { exigirCategoriaDelPapel } from '../../existentes.js';
import type { ConsultasTerceros } from '../../puertos/consultas.js';
import type { RepositorioCategorias, RepositorioContactos, RepositorioTerceros } from '../../puertos/repositorios.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioTerceros;
  categorias: RepositorioCategorias;
  contactos: RepositorioContactos;
  consultas: ConsultasTerceros;
  avisoDeParecidos: AvisoDeParecidos;
  publicadorEventos: PublicadorEventos;
}

/** Registra a alguien con sus datos, el papel con que entra y sus contactos, todo o nada. */
export class RegistrarTercero {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws HayTercerosParecidos si se parece a otro y no se confirmó.
   * @throws RecursoNoEncontrado si la categoría del proveedor no existe.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeAltaDeTercero): Promise<TerceroDto> {
    const { unidadDeTrabajo, repositorio, categorias, consultas, avisoDeParecidos } = this.dependencias;
    const tercero = Tercero.registrar(Identificador.desde(operador.cuentaId), datosDeTercero(solicitud));
    if (solicitud.papel) tercero.asignarPapel(solicitud.papel);

    const registrado = await unidadDeTrabajo.ejecutar(operador, async () => {
      if (solicitud.papel) await exigirCategoriaDelPapel(categorias, solicitud.papel);
      await avisoDeParecidos.exigirQueNoHaya(tercero, solicitud.confirmarDuplicado);
      await repositorio.agregar(tercero);
      await this.agregarContactos(tercero, solicitud.contactos);
      return consultas.obtener(tercero.id.valor);
    });
    await this.dependencias.publicadorEventos.publicar(tercero.extraerEventos());
    return registrado;
  }

  private async agregarContactos(tercero: Tercero, solicitudes: SolicitudDeContacto[]): Promise<void> {
    const de = { terceroId: tercero.id, cuentaId: tercero.cuentaId };
    for (const solicitud of solicitudes) {
      await this.dependencias.contactos.agregar(Contacto.agregar(de, datosDeContacto(solicitud)));
    }
  }
}
