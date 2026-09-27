import { cuentaExistente } from '../cuenta-existente.js';
import type { EstadoDeModuloDto } from '../dto/cuenta.dto.js';
import type { CatalogoDeModulos } from '../puertos/catalogo-de-modulos.js';
import type { RepositorioCuentas } from '../puertos/repositorio-cuentas.js';
import type { ModuloDeLaCuenta } from './activar-modulo.js';
import type { ListarModulos } from './listar-modulos.js';

interface Dependencias {
  repositorio: RepositorioCuentas;
  catalogo: CatalogoDeModulos;
  listarModulos: ListarModulos;
}

/** Los datos del módulo se conservan; solo deja de estar disponible. */
export class DesactivarModulo {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws RecursoNoEncontrado si la cuenta no existe.
   * @throws ModuloEsencial o ModuloEnUso.
   */
  async ejecutar({ cuentaId, modulo }: ModuloDeLaCuenta): Promise<EstadoDeModuloDto[]> {
    const { repositorio, catalogo, listarModulos } = this.dependencias;
    const cuenta = await cuentaExistente(repositorio, cuentaId);
    catalogo.exigirQueSePuedaDesactivar(modulo, catalogo.activos(await repositorio.modulosContratados(cuenta.id)));
    await repositorio.dejarDeContratar(cuenta.id, modulo);
    return listarModulos.ejecutar(cuentaId);
  }
}
