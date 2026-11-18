import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { CondicionesDeProveedorDto } from '../../dto/condiciones-de-proveedor.dto.js';
import type { CondicionesDeProveedores, PlazoPorOmision } from '../../puertos/puertos-de-documentos.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  condiciones: CondicionesDeProveedores;
  plazo: PlazoPorOmision;
}

export class ObtenerCondicionesDeProveedor {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * Un proveedor sin condiciones guardadas devuelve las de por omisión (sin días de crédito, desde la emisión), y siempre
   * el plazo por omisión de la empresa activa.
   * @throws RecursoNoEncontrado si el proveedor no existe en la cuenta.
   */
  ejecutar(operador: Operador, proveedorId: string): Promise<CondicionesDeProveedorDto> {
    const { unidadDeTrabajo, condiciones, plazo } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      if (!(await condiciones.existeElProveedor(proveedorId))) throw new RecursoNoEncontrado('El proveedor');
      const guardadas = await condiciones.deProveedor(proveedorId);
      return { proveedorId, ...guardadas, mesesPorOmision: await plazo.meses(operador) };
    });
  }
}
