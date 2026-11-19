import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { DocumentoDto, FiltrosDeDocumentos, VistaDelKardex } from '../../dto/documento.dto.js';
import type { DependenciasDelKardex } from '../../kardex/dependencias-del-kardex.js';
import { documentoSegunLaVista } from '../../kardex/vista-del-kardex.js';

type Dependencias = Pick<DependenciasDelKardex, 'unidadDeTrabajo' | 'consultas'>;

export class ListarDocumentos {
  constructor(private readonly dependencias: Dependencias) {}

  /** Los documentos de las bodegas que el usuario ve, del más reciente al más antiguo; sin `costos.ver`, sin dinero. */
  ejecutar(operador: Operador, filtros: FiltrosDeDocumentos, vista: VistaDelKardex): Promise<DocumentoDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () =>
      (await consultas.documentos(filtros)).map((documento) => documentoSegunLaVista(documento, vista)),
    );
  }
}
