import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { DatosFiscalesDeEmpresa } from '../../../dominio/datos-fiscales-de-empresa.js';
import type { DatosFiscalesDeEmpresaDto } from '../../dto/datos-fiscales.dto.js';
import type {
  AccesoAEmpresas,
  RepositorioDeDatosFiscalesDeEmpresa,
} from '../../puertos/repositorios-de-datos-fiscales.js';
import { dtoDeEmpresa } from './dtos-de-datos-fiscales.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioDeDatosFiscalesDeEmpresa;
  acceso: AccesoAEmpresas;
}

export class ObtenerDatosFiscalesDeEmpresa {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * Trabaja con la empresa pedida como empresa de la transacción (el formulario de Empresas edita cualquiera
   * de la cuenta, no solo la activa). Sin datos guardados, devuelve los valores por omisión.
   * @throws RecursoNoEncontrado si la empresa no es de la cuenta o el operador no tiene acceso a ella.
   */
  ejecutar(operador: Operador, empresaId: string): Promise<DatosFiscalesDeEmpresaDto> {
    const { unidadDeTrabajo, repositorio, acceso } = this.dependencias;
    return unidadDeTrabajo.ejecutar({ ...operador, empresaId }, async () => {
      await acceso.exigirAcceso(operador, empresaId);
      const guardados = await repositorio.buscar(empresaId);
      return dtoDeEmpresa(empresaId, guardados ?? DatosFiscalesDeEmpresa.porOmision(), guardados !== null);
    });
  }
}
