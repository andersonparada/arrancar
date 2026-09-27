import { cuentaExistente } from '../cuenta-existente.js';
import type { EstadoDeModuloDto } from '../dto/cuenta.dto.js';
import type { CatalogoDeModulos } from '../puertos/catalogo-de-modulos.js';
import type { RepositorioCuentas } from '../puertos/repositorio-cuentas.js';
import type { ListarModulos } from './listar-modulos.js';

interface Dependencias {
  repositorio: RepositorioCuentas;
  catalogo: CatalogoDeModulos;
  listarModulos: ListarModulos;
}

export interface ModuloDeLaCuenta {
  cuentaId: string;
  modulo: string;
}

export class ActivarModulo {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws RecursoNoEncontrado si la cuenta no existe.
   * @throws ModuloDesconocido o FaltanDependenciasDelModulo.
   */
  async ejecutar({ cuentaId, modulo }: ModuloDeLaCuenta): Promise<EstadoDeModuloDto[]> {
    const { repositorio, catalogo, listarModulos } = this.dependencias;
    const cuenta = await cuentaExistente(repositorio, cuentaId);
    catalogo.exigirQueSePuedaActivar(modulo, catalogo.activos(await repositorio.modulosContratados(cuenta.id)));
    await repositorio.contratar(cuenta.id, modulo);
    return listarModulos.ejecutar(cuentaId);
  }
}
