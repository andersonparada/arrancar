import type { EstadoDelVale } from '../../dominio/vales-provisionales.js';
import type { ComprobanteDto } from './comprobantes.dto.js';

/** Un vale provisional en la lista de un fondo. El dinero viaja como texto con dos decimales. */
export interface ValeProvisionalResumenDto {
  id: string;
  fondoId: string;
  numero: number;
  fecha: string;
  entregadoA: string;
  entregadoAUsuarioId: string | null;
  monto: string;
  motivo: string;
  estado: EstadoDelVale;
  fechaDeLiquidacion: string | null;
  /** Lo que regresó al fondo al liquidar. */
  devuelto: string;
  fechaDeAnulacion: string | null;
  motivoDeAnulacion: string | null;
  /** Días que lleva abierto; 0 si ya no lo está. */
  diasAbierto: number;
  /** «Vale viejo» y lo que avisó la liquidación (bancarización, documento fuera del libro). */
  avisos: string[];
}

/** La ficha del vale, para imprimir y para liquidar; también es lo que queda en la auditoría como «anterior». */
export interface ValeProvisionalDto extends ValeProvisionalResumenDto {
  /** Lo que sumaron los comprobantes vigentes del vale (las notas de crédito restan). */
  gastado: string;
  comprobantes: ComprobanteDto[];
}
