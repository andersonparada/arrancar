import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { ProveedorConDocumentosDto } from '../../dto/documento-por-pagar.dto.js';
import type { ConsultasDeSaldos } from '../../puertos/puertos-de-consultas.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  saldos: ConsultasDeSaldos;
}

/**
 * Los proveedores con algún documento por pagar en la empresa activa, para el filtro de la lista. Quien ve los
 * documentos por pagar no necesita permiso sobre Terceros, ni se le entrega toda la cartera de proveedores.
 */
export class ListarProveedoresConDocumentos {
  constructor(private readonly dependencias: Dependencias) {}

  ejecutar(operador: Operador): Promise<ProveedorConDocumentosDto[]> {
    const { unidadDeTrabajo, saldos } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => saldos.proveedoresConDocumentos());
  }
}
