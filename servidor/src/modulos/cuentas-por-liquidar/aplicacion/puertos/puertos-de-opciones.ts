import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type { MediosDePago } from '../../../core/contratos/bancos.contratos.js';

/** Las cuentas y chequeras de Bancos que se ofrecen al entregar o reembolsar (se leen por el mediador). */
export interface MediosDePagoDeBancos {
  medios(operador: Operador, fecha: string): Promise<MediosDePago>;
}

/** Un concepto de gasto del libro de compras, para el gasto sin documento. */
export interface ConceptoParaGasto {
  id: string;
  nombre: string;
}

/** Los conceptos de gasto activos de la empresa (lectura de las tablas del libro; RLS limita a la empresa). */
export interface ConceptosParaGasto {
  listarActivos(): Promise<ConceptoParaGasto[]>;
}
