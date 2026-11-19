import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Articulo } from '../../../dominio/articulo.js';
import { datosDeArticulo } from '../../datos-de-articulo.js';
import type { ArticuloDto, SolicitudDeArticulo } from '../../dto/articulo.dto.js';
import type { DependenciasDeArticulos } from './dependencias-de-articulos.js';

export class CrearArticulo {
  constructor(private readonly dependencias: DependenciasDeArticulos) {}

  /**
   * @throws ArticuloInvalido u otro error de datos si no cumple las reglas del dominio.
   * @throws RecursoDuplicado si repite un dato que debe ser único.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeArticulo): Promise<ArticuloDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    const articulo = Articulo.crear(Identificador.desde(operador.empresaId), datosDeArticulo(solicitud));
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await consultas.exigirReferencias(solicitud);
      await repositorio.agregar(articulo);
      return consultas.obtener(articulo.id.valor);
    });
  }
}
