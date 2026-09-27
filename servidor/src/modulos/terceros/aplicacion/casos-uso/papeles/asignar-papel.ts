import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { PapelDeClienteDto, PapelDeProveedorDto, SolicitudDePapel } from '../../dto/tercero.dto.js';
import { exigirCategoriaDelPapel, terceroExistente } from '../../existentes.js';
import type { ConsultasTerceros } from '../../puertos/consultas.js';
import type { RepositorioCategorias, RepositorioTerceros } from '../../puertos/repositorios.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioTerceros;
  categorias: RepositorioCategorias;
  consultas: ConsultasTerceros;
  publicadorEventos: PublicadorEventos;
}

/** Hace al tercero cliente o proveedor de la cuenta; si ya lo era, cambia los datos del papel. */
export class AsignarPapel {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws RecursoNoEncontrado si el tercero o la categoría de proveedor no existen.
   * @throws TerceroInactivo si el tercero está inactivo.
   */
  async ejecutar(
    operador: Operador,
    asignacion: { terceroId: string; papel: SolicitudDePapel },
  ): Promise<PapelDeClienteDto | PapelDeProveedorDto> {
    const { unidadDeTrabajo, repositorio, categorias, consultas, publicadorEventos } = this.dependencias;

    const { tercero, asignado } = await unidadDeTrabajo.ejecutar(operador, async () => {
      const tercero = await terceroExistente(repositorio, asignacion.terceroId);
      await exigirCategoriaDelPapel(categorias, asignacion.papel);
      tercero.asignarPapel(asignacion.papel);
      await repositorio.guardar(tercero);
      return { tercero, asignado: await consultas.obtenerPapel(asignacion.terceroId, asignacion.papel.tipo) };
    });
    await publicadorEventos.publicar(tercero.extraerEventos());
    return asignado;
  }
}
