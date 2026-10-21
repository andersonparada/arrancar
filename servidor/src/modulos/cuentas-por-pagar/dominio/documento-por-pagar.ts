import type { EstadoDeDocumento, TipoDeDocumento } from './tipos-de-documento.js';

/** Un documento de Libro de compras recibido en Cuentas por pagar. El dinero va en centavos enteros. */
export interface DocumentoPorPagar {
  id: string;
  /** El id del documento en Libro de compras. */
  documentoId: string;
  tipo: TipoDeDocumento;
  proveedorId: string;
  /** La factura (id de Libro de compras) de una nota. */
  documentoAfectadoId: string | null;
  /** `AAAA-MM-DD`. */
  fechaEmision: string;
  totalCentavos: number;
  retencionesCentavos: number;
  tieneActivoFijo: boolean;
  /** `AAAA-MM-DD`; nulo en las notas de crédito, que no vencen. */
  vencimiento: string | null;
  estado: EstadoDeDocumento;
}

/** Lo que se le paga al proveedor por un cargo: el total menos lo retenido, que es de la SAT. */
export function netoDe({ totalCentavos, retencionesCentavos }: DocumentoPorPagar): number {
  return totalCentavos - retencionesCentavos;
}
