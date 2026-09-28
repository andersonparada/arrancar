import { auditarCambioDeEstado, type Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { PapelDeClienteDto, PapelDeProveedorDto, SolicitudDePapel } from '../../dto/tercero.dto.js';
import { exigirCategoriaDelPapel, terceroExistente } from '../../existentes.js';
import type { ConsultasTerceros } from '../../puertos/consultas.js';
import type { RepositorioCategorias, RepositorioTerceros } from '../../puertos/repositorios.js';
import { RECURSO_DEL_PAPEL } from './quitar-papel.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioTerceros;
  categorias: RepositorioCategorias;
  consultas: ConsultasTerceros;
  publicadorEventos: PublicadorEventos;
  auditoria: Auditoria;
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
      const anterior = tercero.tienePapel(asignacion.papel.tipo)
        ? await consultas.obtenerPapel(asignacion.terceroId, asignacion.papel.tipo)
        : null;
      tercero.asignarPapel(asignacion.papel);
      await repositorio.guardar(tercero);
      if (anterior) await this.auditar(asignacion, anterior);
      return { tercero, asignado: await consultas.obtenerPapel(asignacion.terceroId, asignacion.papel.tipo) };
    });
    await publicadorEventos.publicar(tercero.extraerEventos());
    return asignado;
  }

  /** Volver a asignar un papel que estaba inactivo lo reactiva. */
  private auditar(
    { terceroId, papel }: { terceroId: string; papel: SolicitudDePapel },
    anterior: PapelDeClienteDto | PapelDeProveedorDto,
  ): Promise<void> {
    return auditarCambioDeEstado(this.dependencias.auditoria, {
      recurso: RECURSO_DEL_PAPEL[papel.tipo],
      registroId: terceroId,
      anterior,
      activoAntes: anterior.activo,
      activoDespues: papel.activo,
    });
  }
}
