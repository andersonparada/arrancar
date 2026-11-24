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

/** Un tercero de la cuenta que puede recibir un anticipo. */
export interface BeneficiarioParaElegir {
  id: string;
  nombreMostrar: string;
  nit: string | null;
  activo: boolean;
}

/** Los terceros activos de la cuenta (lectura; RLS por cuenta), sin pedir el permiso de Terceros. */
export interface BeneficiariosParaElegir {
  listarActivos(): Promise<BeneficiarioParaElegir[]>;
  /** Solo los que ya tienen anticipos en la empresa, con su nombre y sin NIT (para filtrar la lista). */
  listarConAnticipos(): Promise<BeneficiarioParaElegir[]>;
}
