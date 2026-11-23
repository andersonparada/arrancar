import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { DocumentoDto, VistaDelKardex } from '../../dto/documento.dto.js';
import { documentoSegunLaVista } from '../../kardex/vista-del-kardex.js';
import type { DependenciasDeRecepciones } from './dependencias-de-recepciones.js';

type Lectura = Pick<DependenciasDeRecepciones, 'unidadDeTrabajo' | 'consultas'>;

export class ListarRecepcionesDeUnaFactura {
  constructor(private readonly dependencias: Lectura) {}

  /**
   * Las recepciones vigentes de una factura del libro, con sus renglones, para elegir qué devolver al proveedor. Las
   * ve quien puede recibir (no hace falta `existencias.ver`); las bodegas que no ve el usuario no aparecen.
   */
  ejecutar(operador: Operador, documentoDeCompraId: string, vista: VistaDelKardex): Promise<DocumentoDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () =>
      (await consultas.documentos({ clase: 'recepcion_de_compra', estado: 'vigente', documentoDeCompraId })).map(
        (documento) => documentoSegunLaVista(documento, vista),
      ),
    );
  }
}
