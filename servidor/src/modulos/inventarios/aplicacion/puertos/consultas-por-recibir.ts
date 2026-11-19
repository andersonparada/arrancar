import type { FiltrosDePorRecibir, LineaPorRecibirDto } from '../dto/por-recibir.dto.js';

/** Una línea de la bandeja tal como sale de la base: el dinero en centavos. */
export type FilaPorRecibir = Omit<
  LineaPorRecibirDto,
  'costo' | 'recibido' | 'pendiente' | 'anteriorALaFechaDeInicio'
> & {
  costoCentavos: bigint;
  recibidoCentavos: bigint;
};

/** La bandeja «Por recibir» (§6.3): una consulta sobre el libro y el kardex, sin tabla propia. */
export interface ConsultasPorRecibir {
  listar(filtros: FiltrosDePorRecibir): Promise<FilaPorRecibir[]>;
}
