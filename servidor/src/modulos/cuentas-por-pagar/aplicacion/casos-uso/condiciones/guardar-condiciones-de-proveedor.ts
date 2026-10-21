import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { CambioDeCondiciones } from '../../../dominio/condiciones-de-proveedor.js';
import type { CondicionesDeProveedores } from '../../puertos/puertos-de-documentos.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  condiciones: CondicionesDeProveedores;
}

/**
 * Guarda la sección «Cuentas por pagar» del formulario de Proveedores (días de crédito y desde qué fecha corren). Lo
 * llama el aviso `terceros.proveedor_guardado` dentro de la transacción del formulario: si algo falla, no se guarda
 * nada. Lo que el formulario no trae se queda como estaba. No se audita: no es dinero ni una baja (queda
 * `actualizado_por`).
 */
export class GuardarCondicionesDeProveedor {
  constructor(private readonly dependencias: Dependencias) {}

  ejecutar(operador: Operador, proveedorId: string, cambio: CambioDeCondiciones): Promise<void> {
    const { unidadDeTrabajo, condiciones } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => condiciones.guardar(proveedorId, cambio));
  }
}
