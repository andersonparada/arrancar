import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Dpi } from '../../../../core/compartido/dominio/objetos-valor/dpi.js';
import { DpiYaRegistrado } from '../../errores.js';
import type { ConsultasTerceros } from '../../puertos/consultas.js';
import type { RepositorioTerceros } from '../../puertos/repositorios.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioTerceros;
  consultas: ConsultasTerceros;
}

/**
 * Atiende la orden `terceros.completar_dpi`: Libro de compras la manda al registrar una factura especial cuyo
 * vendedor se identifica por DPI (CUI) y el proveedor aún no lo tiene. Corre en la transacción de quien la manda,
 * así que cualquier rechazo deshace también el documento. Poner un DPI vacío no es una baja ni una corrección de
 * dinero o fechas, por eso no se audita; la autoría la fija la transacción.
 */
export class CompletarDpiDeProveedor {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws DpiInvalido si el DPI no es válido.
   * @throws RecursoNoEncontrado si el proveedor no existe en la cuenta.
   * @throws ProveedorYaTieneOtroDpi si el proveedor ya tiene un DPI distinto.
   * @throws DpiYaRegistrado si el DPI es de otro tercero de la cuenta.
   */
  async ejecutar(operador: Operador, pedido: { proveedorId: string; dpi: string }): Promise<void> {
    const dpi = Dpi.crear(pedido.dpi);
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;

    await unidadDeTrabajo.ejecutar(operador, async () => {
      const tercero = await repositorio.buscarDeProveedor(pedido.proveedorId);
      if (!tercero) throw new RecursoNoEncontrado('El proveedor');
      const otro = await consultas.nombreDelOtroConDpi(dpi.valor, tercero.id.valor);
      if (otro) throw new DpiYaRegistrado(otro);
      if (tercero.completarDpi(dpi)) await repositorio.guardar(tercero);
    });
  }
}
