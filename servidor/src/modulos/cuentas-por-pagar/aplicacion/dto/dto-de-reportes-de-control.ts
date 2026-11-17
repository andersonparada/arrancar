import { deCentavos } from '../../../core/compartido/dominio/centavos.js';
import { EFECTO_DE_LA_CAUSA, EFECTO_DE_LA_DIFERENCIA_DE_UN_CARGO } from '../../dominio/ajustes.js';
import type {
  AjusteDelMes,
  AplicacionManualDelMes,
  DocumentoRevertidoEnElMes,
  PagoAAperturaDelMes,
} from '../puertos/puertos-de-reportes-de-control.js';
import type {
  FilaDeAjusteDelMesDto,
  FilaDeAplicacionManualDto,
  FilaDeDocumentoRevertidoDto,
  FilaDePagoAAperturaDto,
} from './reportes-de-control.dto.js';

export const MARCA_DE_MES_ANTERIOR = 'De un mes anterior: revise la rectificación del IVA.';

const conSerie = (serie: string | null, numero: string): string => (serie ? `${serie}-${numero}` : numero);

export function filaDeAjusteDto(ajuste: AjusteDelMes): FilaDeAjusteDelMesDto {
  const { montoCentavos, serie, numero, numeroDelPago, emisionDelDocumento, ...resto } = ajuste;
  return {
    id: resto.id,
    fecha: resto.fecha,
    documentoId: resto.documentoId,
    documento: conSerie(serie, numero),
    proveedorId: resto.proveedorId,
    proveedorNombre: resto.proveedorNombre,
    causa: resto.causa,
    efecto: numeroDelPago ? EFECTO_DE_LA_DIFERENCIA_DE_UN_CARGO : EFECTO_DE_LA_CAUSA[resto.causa],
    monto: deCentavos(montoCentavos),
    referencia: resto.referencia,
    motivo: resto.motivo,
    pago: numeroDelPago,
    registro: resto.registro,
    estado: resto.estado,
    anuladoPor: resto.anuladoPor,
    anuladoEn: resto.anuladoEn,
    motivoDeAnulacion: resto.motivoDeAnulacion,
    anioAnterior: emisionDelDocumento.slice(0, 4) < resto.fecha.slice(0, 4),
  };
}

export function filaDeAplicacionManualDto({
  montoCentavos,
  ...resto
}: AplicacionManualDelMes): FilaDeAplicacionManualDto {
  return { ...resto, monto: deCentavos(montoCentavos) };
}

export function filaDePagoAAperturaDto({ montoCentavos, ...resto }: PagoAAperturaDelMes): FilaDePagoAAperturaDto {
  return { ...resto, monto: deCentavos(montoCentavos) };
}

/** Un documento anulado o devuelto, con la marca si su emisión es de un mes anterior al del reporte. */
export function filaDeDocumentoRevertidoDto(
  { serie, numero, totalCentavos, ...resto }: DocumentoRevertidoEnElMes,
  inicioDelMes: string,
): FilaDeDocumentoRevertidoDto {
  const deUnMesAnterior = resto.emision < inicioDelMes;
  return {
    ...resto,
    documento: conSerie(serie, numero),
    total: deCentavos(totalCentavos),
    deUnMesAnterior,
    marca: deUnMesAnterior ? MARCA_DE_MES_ANTERIOR : null,
  };
}
