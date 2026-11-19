import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { DocumentoDto, VistaDelKardex } from '../../dto/documento.dto.js';
import type { DependenciasDelKardex } from '../../kardex/dependencias-del-kardex.js';
import { documentoSegunLaVista } from '../../kardex/vista-del-kardex.js';

type Dependencias = Pick<DependenciasDelKardex, 'unidadDeTrabajo' | 'consultas'>;

export class ObtenerDocumento {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * Un documento con sus renglones.
   * @throws RecursoNoEncontrado si no existe o el usuario no ve su bodega.
   */
  ejecutar(operador: Operador, documentoId: string, vista: VistaDelKardex): Promise<DocumentoDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () =>
      documentoSegunLaVista(await consultas.documento(documentoId), vista),
    );
  }
}
