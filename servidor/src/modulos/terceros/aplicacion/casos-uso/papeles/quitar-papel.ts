import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { auditarCambioDeEstado, type Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { TipoDePapel } from '../../../dominio/papeles.js';
import { terceroExistente } from '../../existentes.js';
import type { ConsultasTerceros } from '../../puertos/consultas.js';
import type { RepositorioTerceros } from '../../puertos/repositorios.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioTerceros;
  publicadorEventos: PublicadorEventos;
  consultas: ConsultasTerceros;
  auditoria: Auditoria;
}

/** En la auditoría, cada papel es su propio recurso; el registro es el tercero. */
export const RECURSO_DEL_PAPEL: Record<TipoDePapel, string> = {
  cliente: 'terceros.clientes',
  proveedor: 'terceros.proveedores',
};

/** El papel queda inactivo y conserva su historial; los demás papeles del tercero no cambian. */
export class QuitarPapel {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws RecursoNoEncontrado si el tercero no existe o nunca tuvo ese papel. */
  async ejecutar(operador: Operador, quitado: { terceroId: string; tipo: TipoDePapel }): Promise<void> {
    const { unidadDeTrabajo, repositorio, publicadorEventos } = this.dependencias;

    const tercero = await unidadDeTrabajo.ejecutar(operador, async () => {
      const tercero = await terceroExistente(repositorio, quitado.terceroId);
      if (!tercero.tienePapel(quitado.tipo)) throw new RecursoNoEncontrado(`El papel de ${quitado.tipo}`);
      const anterior = await this.dependencias.consultas.obtenerPapel(quitado.terceroId, quitado.tipo);
      tercero.quitarPapel(quitado.tipo);
      await repositorio.guardar(tercero);
      await auditarCambioDeEstado(this.dependencias.auditoria, {
        recurso: RECURSO_DEL_PAPEL[quitado.tipo],
        registroId: quitado.terceroId,
        anterior,
        activoAntes: anterior.activo,
        activoDespues: false,
      });
      return tercero;
    });
    await publicadorEventos.publicar(tercero.extraerEventos());
  }
}
