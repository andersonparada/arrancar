import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { CategoriaDeProveedor } from '../../../dominio/categoria-de-proveedor.js';
import type { CategoriaDto, SolicitudDeCategoria } from '../../dto/categoria.dto.js';
import type { ConsultasCategorias } from '../../puertos/consultas.js';
import type { RepositorioCategorias } from '../../puertos/repositorios.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioCategorias;
  consultas: ConsultasCategorias;
}

export class CrearCategoria {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws RecursoDuplicado si la cuenta ya tiene una categoría con ese nombre. */
  ejecutar(operador: Operador, solicitud: SolicitudDeCategoria): Promise<CategoriaDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    const categoria = CategoriaDeProveedor.crear(Identificador.desde(operador.cuentaId), solicitud);
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await repositorio.agregar(categoria);
      return consultas.obtener(categoria.id.valor);
    });
  }
}
