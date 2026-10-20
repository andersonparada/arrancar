import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { NotaSobreFacturaEspecial } from '../../../dominio/errores-de-factura-especial.js';
import { FacturaAfectadaIncoherente } from '../../../dominio/errores-de-documento.js';
import { exigirFacturaQueAdmiteLaNota } from '../../../dominio/factura-de-la-nota.js';
import { esNota } from '../../../dominio/tipos-de-documento.js';
import type { SolicitudDeDocumento } from '../../dto/solicitud-de-documento.js';
import type { ConsultasDeDocumentos, FacturaParaNota } from '../../puertos/puertos-de-documentos.js';

type DatosParaLaFactura = Pick<SolicitudDeDocumento, 'tipo' | 'proveedorId' | 'destino' | 'documentoAfectadoId'> & {
  /** La casilla del documento, ya resuelta: la nota y su factura van las dos en el libro o las dos fuera. */
  muestraEnReportesSat: boolean;
};

/** Busca la factura que corrige una nota (de crédito o de débito) y revisa que sirva (`exigirFacturaQueAdmiteLaNota`). */
export class ResolutorDeFactura {
  constructor(private readonly consultas: ConsultasDeDocumentos) {}

  /**
   * Devuelve la factura de la nota, o `null` si el documento no es una nota. Con `bloquear` la fila queda
   * bloqueada hasta el fin de la transacción: dos notas simultáneas no se pasan de la factura.
   * @throws FacturaAfectadaIncoherente si la nota no trae factura o un documento que no es nota trae una.
   * @throws RecursoNoEncontrado si la factura no existe en la empresa.
   * @throws NotaSobreFacturaEspecial si la factura es una factura especial.
   * @throws FacturaNoSirveParaLaNota si no es una factura vigente del mismo proveedor y destino, o la casilla difiere.
   */
  async resolver(solicitud: DatosParaLaFactura, bloquear: boolean): Promise<FacturaParaNota | null> {
    const { tipo, documentoAfectadoId } = solicitud;
    if (!esNota(tipo)) {
      if (documentoAfectadoId !== null) {
        throw new FacturaAfectadaIncoherente('Solo una nota de crédito o de débito lleva la factura que corrige.');
      }
      return null;
    }
    if (documentoAfectadoId === null) throw new FacturaAfectadaIncoherente('Elija la factura que corrige la nota.');
    const factura = await this.consultas.buscarFacturaParaNota(documentoAfectadoId, bloquear);
    if (!factura) throw new RecursoNoEncontrado('La factura');
    if (factura.tipo === 'factura_especial') throw new NotaSobreFacturaEspecial();
    exigirFacturaQueAdmiteLaNota(factura, { ...solicitud, tipo });
    return factura;
  }
}
