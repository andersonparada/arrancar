import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  FacturaAfectadaIncoherente,
  FacturaNoSirveParaLaNota,
  NotaSuperaLaFactura,
} from '../../../dominio/errores-de-documento.js';
import type { SolicitudDeDocumento } from '../../dto/solicitud-de-documento.js';
import type { ConsultasDeDocumentos, FacturaParaNota } from '../../puertos/puertos-de-documentos.js';

const TIPOS_QUE_SE_REBAJAN = ['factura', 'factura_pequeno_contribuyente'];

type DatosParaLaFactura = Pick<SolicitudDeDocumento, 'tipo' | 'proveedorId' | 'destino' | 'documentoAfectadoId'>;

/** Busca la factura que rebaja una nota de crédito y revisa que sirva: vigente, del mismo proveedor y destino. */
export class ResolutorDeFactura {
  constructor(private readonly consultas: ConsultasDeDocumentos) {}

  /**
   * Devuelve la factura de la nota, o `null` si el documento no es una nota. Con `bloquear` la fila queda
   * bloqueada hasta el fin de la transacción: dos notas simultáneas no se pasan de la factura.
   * @throws FacturaAfectadaIncoherente si la nota no trae factura o un documento que no es nota trae una.
   * @throws RecursoNoEncontrado si la factura no existe en la empresa.
   * @throws FacturaNoSirveParaLaNota si no es una factura vigente del mismo proveedor y destino.
   */
  async resolver(solicitud: DatosParaLaFactura, bloquear: boolean): Promise<FacturaParaNota | null> {
    const esNota = solicitud.tipo === 'nota_de_credito';
    if (!esNota && solicitud.documentoAfectadoId !== null) {
      throw new FacturaAfectadaIncoherente('Solo una nota de crédito lleva la factura que rebaja.');
    }
    if (!esNota) return null;
    if (solicitud.documentoAfectadoId === null) {
      throw new FacturaAfectadaIncoherente('Elija la factura que rebaja la nota de crédito.');
    }
    const factura = await this.consultas.buscarFacturaParaNota(solicitud.documentoAfectadoId, bloquear);
    if (!factura) throw new RecursoNoEncontrado('La factura');
    exigirQueSirva(factura, solicitud);
    return factura;
  }
}

function exigirQueSirva(factura: FacturaParaNota, solicitud: DatosParaLaFactura): void {
  if (factura.estado !== 'vigente' || !TIPOS_QUE_SE_REBAJAN.includes(factura.tipo)) {
    throw new FacturaNoSirveParaLaNota('La nota de crédito debe rebajar una factura vigente.');
  }
  if (factura.proveedorId !== solicitud.proveedorId || factura.destino !== solicitud.destino) {
    throw new FacturaNoSirveParaLaNota('La factura debe ser del mismo proveedor y del mismo destino que la nota.');
  }
}

/** Las notas vigentes de la factura, con la nueva, no pasan del total de la factura. */
export function exigirQueLaNotaNoSupereLaFactura(factura: FacturaParaNota, totalDeLaNota: number): void {
  if (factura.totalDeNotas + totalDeLaNota > factura.total) throw new NotaSuperaLaFactura();
}
