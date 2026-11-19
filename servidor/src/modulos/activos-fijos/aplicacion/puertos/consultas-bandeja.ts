import type { FiltrosDeBandeja } from '../dto/bandeja.dto.js';

/** Una línea de la bandeja tal como sale de la base: los montos en centavos, con signo. */
export interface FilaDeBandeja {
  lineaId: string;
  documentoId: string;
  numeroDeLinea: number;
  tipoDeDocumento: string;
  documento: string;
  fechaEmision: string;
  proveedorNombre: string;
  conceptoId: string;
  conceptoNombre: string;
  descripcion: string | null;
  tipoDeLinea: 'bien' | 'servicio';
  costoCentavos: number;
  capitalizadoCentavos: number;
  claseSugeridaId: string | null;
  claseSugeridaNombre: string | null;
  activoSugeridoId: string | null;
  activoSugeridoCodigo: string | null;
}

/** La bandeja «Por capitalizar»: una consulta sobre el libro (no tiene tabla propia). */
export interface ConsultasBandeja {
  listar(filtros: FiltrosDeBandeja): Promise<FilaDeBandeja[]>;
}
