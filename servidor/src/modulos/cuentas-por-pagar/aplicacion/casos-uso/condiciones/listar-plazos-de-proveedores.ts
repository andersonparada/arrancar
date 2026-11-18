import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { PlazoDeProveedorDto } from '../../dto/plazo-de-proveedor.dto.js';
import type { ProveedoresDeLosPlazos } from '../../puertos/puertos-de-plazos.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  proveedores: ProveedoresDeLosPlazos;
}

/** Los proveedores de la cuenta con su plazo de crédito, para exportarlos a Excel. */
export class ListarPlazosDeProveedores {
  constructor(private readonly dependencias: Dependencias) {}

  ejecutar(operador: Operador): Promise<PlazoDeProveedorDto[]> {
    const { unidadDeTrabajo, proveedores } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => proveedores.listar());
  }
}
