import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { DatosFiscalesDeProveedor } from '../../../dominio/datos-fiscales-de-proveedor.js';
import type { DatosFiscalesDeProveedorDto } from '../../dto/datos-fiscales.dto.js';
import type { RepositorioDeDatosFiscalesDeProveedor } from '../../puertos/repositorios-de-datos-fiscales.js';
import { dtoDeProveedor } from './dtos-de-datos-fiscales.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioDeDatosFiscalesDeProveedor;
}

export class ObtenerDatosFiscalesDeProveedor {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * Sin datos guardados, devuelve los valores por omisión.
   * @throws RecursoNoEncontrado si el proveedor no existe en la cuenta.
   */
  ejecutar(operador: Operador, proveedorId: string): Promise<DatosFiscalesDeProveedorDto> {
    const { unidadDeTrabajo, repositorio } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      if (!(await repositorio.existe(proveedorId))) throw new RecursoNoEncontrado('El proveedor');
      const guardados = await repositorio.buscar(proveedorId);
      return dtoDeProveedor(proveedorId, guardados ?? DatosFiscalesDeProveedor.porOmision(), guardados !== null);
    });
  }
}
