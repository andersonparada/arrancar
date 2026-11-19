import type { Operador } from '../../../compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../compartido/aplicacion/unidad-de-trabajo.js';
import type { PaginaDeCorreosDto } from '../dto/correo.dto.js';
import type { FiltroDeCorreos, HistorialDeCorreos } from '../puertos/historial-de-correos.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  historial: HistorialDeCorreos;
}

/** El historial de correos de la empresa activa, del más nuevo al más viejo. */
export class ListarCorreos {
  constructor(private readonly dependencias: Dependencias) {}

  ejecutar(operador: Operador, filtro: FiltroDeCorreos): Promise<PaginaDeCorreosDto> {
    const { unidadDeTrabajo, historial } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => historial.listar(filtro));
  }
}
