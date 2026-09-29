import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import {
  DatosFiscalesDeProveedor,
  type PropiedadesFiscalesDeProveedor,
} from '../../../dominio/datos-fiscales-de-proveedor.js';
import type { RepositorioDeDatosFiscalesDeProveedor } from '../../puertos/repositorios-de-datos-fiscales.js';
import { dtoDeProveedor } from './dtos-de-datos-fiscales.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioDeDatosFiscalesDeProveedor;
  auditoria: Auditoria;
}

interface CambioDeDatosFiscales {
  proveedorId: string;
  datos: PropiedadesFiscalesDeProveedor;
}

/**
 * Guarda la sección fiscal de un proveedor (de la cuenta: vale para todas sus empresas). La llama el aviso
 * `terceros.proveedor_guardado`, dentro de la transacción del formulario de Proveedores.
 */
export class GuardarDatosFiscalesDeProveedor {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * Un cambio respecto de lo que valía (lo guardado o, si nunca se guardó, los valores por omisión) queda en la
   * auditoría como `corregir` con los datos anteriores, porque cambia las retenciones de las compras futuras.
   * @throws DatosFiscalesInvalidos si los datos se contradicen.
   */
  async ejecutar(operador: Operador, { proveedorId, datos }: CambioDeDatosFiscales): Promise<void> {
    const { unidadDeTrabajo, repositorio, auditoria } = this.dependencias;
    const nuevos = DatosFiscalesDeProveedor.crear(datos);
    await unidadDeTrabajo.ejecutar(operador, async () => {
      const guardados = await repositorio.buscar(proveedorId);
      const anteriores = guardados ?? DatosFiscalesDeProveedor.porOmision();
      await repositorio.guardar(proveedorId, nuevos);
      if (anteriores.esIgualA(nuevos)) return;
      await auditoria.registrar({
        recurso: 'libro-de-compras.datos-fiscales-de-proveedor',
        registroId: proveedorId,
        accion: 'corregir',
        anterior: dtoDeProveedor(proveedorId, anteriores, guardados !== null),
      });
    });
  }
}
