import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { datosDeContacto } from '../../conversiones.js';
import type { ContactoDto, SolicitudDeContacto } from '../../dto/contacto.dto.js';
import { contactoDelTercero } from '../../existentes.js';
import type { ConsultasContactos } from '../../puertos/consultas.js';
import type { RepositorioContactos } from '../../puertos/repositorios.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  contactos: RepositorioContactos;
  consultas: ConsultasContactos;
}

interface CambioDeContacto {
  terceroId: string;
  contactoId: string;
  solicitud: SolicitudDeContacto;
}

export class CambiarContacto {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws RecursoNoEncontrado si el contacto no existe o no es de ese tercero. */
  ejecutar(operador: Operador, { solicitud, ...ids }: CambioDeContacto): Promise<ContactoDto> {
    const { unidadDeTrabajo, contactos, consultas } = this.dependencias;
    const datos = datosDeContacto(solicitud);
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const contacto = await contactoDelTercero(contactos, ids);
      contacto.cambiarDatos(datos);
      await contactos.guardar(contacto);
      return consultas.obtener(ids.contactoId);
    });
  }
}
