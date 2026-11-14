import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { NotaSobreFacturaEspecial } from '../../../dominio/errores-de-factura-especial.js';
import { FacturaAfectadaIncoherente } from '../../../dominio/errores-de-documento.js';
import { exigirFacturaQueAdmiteLaNota } from '../../../dominio/factura-de-la-nota.js';
import { esNota } from '../../../dominio/tipos-de-documento.js';
import type { SolicitudDeDocumento } from '../../dto/solicitud-de-documento.js';
import type { ConsultasDeDocumentos, FacturaParaNota } from '../../puertos/puertos-de-documentos.js';
import type { RepositorioDeFacturasAnteriores } from '../../puertos/puertos-de-facturas-anteriores.js';
import {
  ResolutorDeFacturaAnterior,
  type FacturaAnteriorResuelta,
  type NotaSobreFacturaAnterior,
} from './resolutor-de-factura-anterior.js';

type DatosParaLaFactura = Pick<
  SolicitudDeDocumento,
  'tipo' | 'proveedorId' | 'destino' | 'documentoAfectadoId' | 'facturaAnterior'
> & {
  /** La casilla del documento, ya resuelta: la nota y su factura van las dos en el libro o las dos fuera. */
  muestraEnReportesSat: boolean;
};

/** Lo de la empresa y las fechas que hace falta para ubicar una factura del sistema anterior. */
export type ContextoParaLaFactura = Pick<
  NotaSobreFacturaAnterior,
  'fechaDeRecepcion' | 'fechaDeInicio' | 'regimenDeLaEmpresa'
>;

/** La factura de la nota y, si es del sistema anterior, lo que hay que hacer con su fila. */
export interface FacturaResuelta {
  factura: FacturaParaNota | null;
  anterior: FacturaAnteriorResuelta | null;
}

const SIN_FACTURA: FacturaResuelta = { factura: null, anterior: null };

/** Busca la factura que corrige una nota (de crédito o de débito) y revisa que sirva (`exigirFacturaQueAdmiteLaNota`). */
export class ResolutorDeFactura {
  private readonly deLaFacturaAnterior: ResolutorDeFacturaAnterior;

  constructor(
    private readonly consultas: ConsultasDeDocumentos,
    facturasAnteriores: RepositorioDeFacturasAnteriores,
  ) {
    this.deLaFacturaAnterior = new ResolutorDeFacturaAnterior(facturasAnteriores);
  }

  /**
   * Devuelve la factura de la nota, o nada si el documento no es una nota. Con `bloquear` la fila queda bloqueada hasta
   * el fin de la transacción: dos notas simultáneas no se pasan de la factura.
   * @throws FacturaAfectadaIncoherente si la nota no trae factura, trae las dos, o un documento que no es nota trae una.
   * @throws RecursoNoEncontrado si la factura no existe en la empresa.
   * @throws NotaSobreFacturaEspecial si la factura es una factura especial.
   * @throws FacturaNoSirveParaLaNota si no es una factura vigente del mismo proveedor y destino, o la casilla difiere.
   * @throws las reglas de la factura del sistema anterior (`ResolutorDeFacturaAnterior`).
   */
  async resolver(
    solicitud: DatosParaLaFactura,
    contexto: ContextoParaLaFactura,
    bloquear: boolean,
  ): Promise<FacturaResuelta> {
    const { tipo, documentoAfectadoId, facturaAnterior } = solicitud;
    if (!esNota(tipo)) {
      if (documentoAfectadoId !== null || facturaAnterior) {
        throw new FacturaAfectadaIncoherente('Solo una nota de crédito o de débito lleva la factura que corrige.');
      }
      return SIN_FACTURA;
    }
    if (documentoAfectadoId !== null && facturaAnterior) {
      throw new FacturaAfectadaIncoherente('Elija la factura del libro o escriba la del sistema anterior, no las dos.');
    }
    const resuelta = facturaAnterior
      ? await this.delSistemaAnterior({ ...solicitud, facturaAnterior }, contexto, bloquear)
      : { factura: await this.delLibro(documentoAfectadoId, bloquear), anterior: null };
    exigirFacturaQueAdmiteLaNota(resuelta.factura, { ...solicitud, tipo });
    return resuelta;
  }

  private async delLibro(id: string | null, bloquear: boolean): Promise<FacturaParaNota> {
    if (id === null) throw new FacturaAfectadaIncoherente('Elija la factura que corrige la nota.');
    const factura = await this.consultas.buscarFacturaParaNota(id, bloquear);
    if (!factura) throw new RecursoNoEncontrado('La factura');
    if (factura.tipo === 'factura_especial') throw new NotaSobreFacturaEspecial();
    return factura;
  }

  private async delSistemaAnterior(
    solicitud: DatosParaLaFactura & { facturaAnterior: NonNullable<DatosParaLaFactura['facturaAnterior']> },
    contexto: ContextoParaLaFactura,
    bloquear: boolean,
  ): Promise<FacturaResuelta & { factura: FacturaParaNota }> {
    const { proveedorId, destino, muestraEnReportesSat } = solicitud;
    const anterior = await this.deLaFacturaAnterior.resolver(
      solicitud.facturaAnterior,
      { proveedorId, destino, muestraEnReportesSat, ...contexto },
      bloquear,
    );
    return { factura: anterior.factura, anterior };
  }
}
