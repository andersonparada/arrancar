import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Nit } from '../../../../core/compartido/dominio/objetos-valor/nit.js';
import { NitYaRegistrado } from '../../errores.js';
import type { ConsultasTerceros } from '../../puertos/consultas.js';
import type { RepositorioTerceros } from '../../puertos/repositorios.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioTerceros;
  consultas: ConsultasTerceros;
}

/**
 * Atiende la orden `terceros.completar_nit`: Libro de compras la manda al registrar un documento con el NIT del
 * emisor y el proveedor aún no lo tiene. Corre en la transacción de quien la manda (la unidad de trabajo se une a
 * ella), así que cualquier rechazo deshace también el documento. Poner un NIT vacío no es una baja ni una
 * corrección de dinero o fechas, por eso no se audita; la autoría la fija la transacción.
 */
export class CompletarNitDeProveedor {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws NitInvalido si el NIT no es válido.
   * @throws NitDeProveedorSinNumero si es consumidor final.
   * @throws RecursoNoEncontrado si el proveedor no existe en la cuenta.
   * @throws ProveedorYaTieneOtroNit si el proveedor ya tiene un NIT distinto.
   * @throws NitYaRegistrado si el NIT es de otro tercero de la cuenta.
   */
  async ejecutar(operador: Operador, pedido: { proveedorId: string; nit: string }): Promise<void> {
    const nit = Nit.crear(pedido.nit);
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;

    await unidadDeTrabajo.ejecutar(operador, async () => {
      const tercero = await repositorio.buscarDeProveedor(pedido.proveedorId);
      if (!tercero) throw new RecursoNoEncontrado('El proveedor');
      const otro = await consultas.nombreDelOtroConNit(nit.valor, tercero.id.valor);
      if (otro) throw new NitYaRegistrado(otro);
      if (tercero.completarNit(nit)) await repositorio.guardar(tercero);
    });
  }
}
