import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { contactoDelTercero } from '../../existentes.js';
import type { ConsultasContactos } from '../../puertos/consultas.js';
import type { RepositorioContactos } from '../../puertos/repositorios.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  contactos: RepositorioContactos;
  consultas: ConsultasContactos;
  auditoria: Auditoria;
}

/** Un contacto sí se borra: no tiene historial propio, a diferencia del tercero. */
export class EliminarContacto {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws RecursoNoEncontrado si el contacto no existe o no es de ese tercero. */
  ejecutar(operador: Operador, ids: { terceroId: string; contactoId: string }): Promise<void> {
    const { unidadDeTrabajo, contactos, consultas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const contacto = await contactoDelTercero(contactos, ids);
      const anterior = await consultas.obtener(ids.contactoId);
      await contactos.eliminar(contacto);
      await auditoria.registrar({
        recurso: 'terceros.contactos',
        registroId: ids.contactoId,
        accion: 'eliminar',
        anterior,
      });
    });
  }
}
