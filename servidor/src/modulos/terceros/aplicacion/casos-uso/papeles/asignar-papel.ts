import { auditarCambioDeEstado, type Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { SeccionesAportadas } from '../../../../core/contratos/secciones.contratos.js';
import type { PapelDeClienteDto, PapelDeProveedorDto, SolicitudDePapel } from '../../dto/tercero.dto.js';
import { exigirCategoriaDelPapel, terceroExistente } from '../../existentes.js';
import type { AvisosDeProveedor } from '../../puertos/avisos-de-proveedor.js';
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
  avisos: AvisosDeProveedor;
}

interface Asignacion {
  terceroId: string;
  papel: SolicitudDePapel;
  /** Lo que otros módulos aportan al formulario de proveedores; solo se usa si el papel es de proveedor. */
  secciones?: SeccionesAportadas;
}

/** Hace al tercero cliente o proveedor de la cuenta; si ya lo era, cambia los datos del papel. */
export class AsignarPapel {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws RecursoNoEncontrado si el tercero o la categoría de proveedor no existen.
   * @throws TerceroInactivo si el tercero está inactivo.
   */
  async ejecutar(operador: Operador, asignacion: Asignacion): Promise<PapelDeClienteDto | PapelDeProveedorDto> {
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
      const asignado = await consultas.obtenerPapel(asignacion.terceroId, asignacion.papel.tipo);
      await this.avisarProveedor(operador, asignacion, asignado);
      return { tercero, asignado };
    });
    await publicadorEventos.publicar(tercero.extraerEventos());
    return asignado;
  }

  /** Los módulos activos guardan su sección del formulario de proveedores, en esta misma transacción. */
  private async avisarProveedor(
    operador: Operador,
    { terceroId, papel, secciones = {} }: Asignacion,
    asignado: PapelDeClienteDto | PapelDeProveedorDto,
  ): Promise<void> {
    if (papel.tipo !== 'proveedor') return;
    await this.dependencias.avisos.proveedorGuardado(operador, { proveedorId: asignado.id, terceroId, secciones });
  }

  /** Volver a asignar un papel que estaba inactivo lo reactiva. */
  private auditar({ terceroId, papel }: Asignacion, anterior: PapelDeClienteDto | PapelDeProveedorDto): Promise<void> {
    return auditarCambioDeEstado(this.dependencias.auditoria, {
      recurso: RECURSO_DEL_PAPEL[papel.tipo],
      registroId: terceroId,
      anterior,
      activoAntes: anterior.activo,
      activoDespues: papel.activo,
    });
  }
}
