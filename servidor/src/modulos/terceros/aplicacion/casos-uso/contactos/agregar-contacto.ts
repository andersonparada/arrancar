import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Contacto } from '../../../dominio/contacto.js';
import { datosDeContacto } from '../../conversiones.js';
import type { ContactoDto, SolicitudDeContacto } from '../../dto/contacto.dto.js';
import { terceroExistente } from '../../existentes.js';
import type { ConsultasContactos } from '../../puertos/consultas.js';
import type { RepositorioContactos, RepositorioTerceros } from '../../puertos/repositorios.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  terceros: RepositorioTerceros;
  contactos: RepositorioContactos;
  consultas: ConsultasContactos;
}

export class AgregarContacto {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws RecursoNoEncontrado si el tercero no existe en la cuenta. */
  ejecutar(operador: Operador, nuevo: { terceroId: string; solicitud: SolicitudDeContacto }): Promise<ContactoDto> {
    const { unidadDeTrabajo, terceros, contactos, consultas } = this.dependencias;
    const datos = datosDeContacto(nuevo.solicitud);
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const tercero = await terceroExistente(terceros, nuevo.terceroId);
      const contacto = Contacto.agregar({ terceroId: tercero.id, cuentaId: tercero.cuentaId }, datos);
      await contactos.agregar(contacto);
      return consultas.obtener(contacto.id.valor);
    });
  }
}
