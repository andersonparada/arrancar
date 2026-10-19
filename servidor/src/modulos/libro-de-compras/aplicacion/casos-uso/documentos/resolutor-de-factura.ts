import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { NotaSobreFacturaEspecial } from '../../../dominio/errores-de-factura-especial.js';
import {
  FacturaAfectadaIncoherente,
  FacturaNoSirveParaLaNota,
  NotaSuperaLaFactura,
} from '../../../dominio/errores-de-documento.js';
import type { SolicitudDeDocumento } from '../../dto/solicitud-de-documento.js';
import type { ConsultasDeDocumentos, FacturaParaNota } from '../../puertos/puertos-de-documentos.js';

/** Las familias a las que una nota de crédito sí rebaja; la factura especial se anula y se registra de nuevo. */
const TIPOS_QUE_SE_REBAJAN: readonly string[] = [
  'factura',
  'factura_pequeno_contribuyente',
  'factura_pequeno_contribuyente_electronico',
  'factura_contribuyente_agropecuario',
  'factura_primario_pecuario',
];

type DatosParaLaFactura = Pick<SolicitudDeDocumento, 'tipo' | 'proveedorId' | 'destino' | 'documentoAfectadoId'>;

/** Busca la factura que rebaja una nota de crédito y revisa que sirva: vigente, del mismo proveedor y destino. */
export class ResolutorDeFactura {
  constructor(private readonly consultas: ConsultasDeDocumentos) {}

  /**
   * Devuelve la factura de la nota, o `null` si el documento no es una nota. Con `bloquear` la fila queda
   * bloqueada hasta el fin de la transacción: dos notas simultáneas no se pasan de la factura.
   * @throws FacturaAfectadaIncoherente si la nota no trae factura o un documento que no es nota trae una.
   * @throws RecursoNoEncontrado si la factura no existe en la empresa.
   * @throws NotaSobreFacturaEspecial si la factura es una factura especial.
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
  if (factura.tipo === 'factura_especial') throw new NotaSobreFacturaEspecial();
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
