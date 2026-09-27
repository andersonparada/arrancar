import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { ContactoDto } from '../../dto/contacto.dto.js';
import type { ConsultasContactos, ConsultasTerceros } from '../../puertos/consultas.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  terceros: ConsultasTerceros;
  contactos: ConsultasContactos;
}

export class ListarContactos {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws RecursoNoEncontrado si el tercero no existe en la cuenta. */
  ejecutar(operador: Operador, terceroId: string): Promise<ContactoDto[]> {
    const { unidadDeTrabajo, terceros, contactos } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await terceros.obtener(terceroId);
      return contactos.listarDeTercero(terceroId);
    });
  }
}
