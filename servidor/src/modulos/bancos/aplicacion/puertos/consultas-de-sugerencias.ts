import type { TipoDeMovimiento } from '../../dominio/asignacion-de-concepto.js';
import type { Ejemplo, Pendiente } from '../../dominio/sugerencias/tipos.js';

/** Un movimiento «Sin clasificar» de la bandeja, con lo que hace falta para compararlo. */
export interface PendienteDeClasificar extends Pendiente {
  id: string;
  tipo: TipoDeMovimiento;
}

/** Los filtros de la bandeja: una cuenta y entre dos fechas (`AAAA-MM-DD`, incluidas). */
export interface FiltroDeSugerencias {
  cuentaBancariaId?: string;
  desde?: string;
  hasta?: string;
}

export interface RangoDeFechas {
  desde: string;
  hasta: string;
}

/**
 * Lecturas de las sugerencias de concepto (P7). Corren dentro de la unidad de trabajo, así que la seguridad por
 * empresa (y algún día por cuenta bancaria) limita lo que se ve. Nada se guarda.
 */
export interface ConsultasDeSugerencias {
  /** Los pendientes de la bandeja (originales vigentes «Sin clasificar»), del más antiguo al más reciente. */
  pendientes(filtro: FiltroDeSugerencias, limite: number): Promise<PendienteDeClasificar[]>;
  /** Los ejemplos con alguno de esos beneficiarios normalizados y fecha dentro del rango. */
  ejemplosPorBeneficiario(claves: string[], rango: RangoDeFechas): Promise<Ejemplo[]>;
  /** Los ejemplos sin beneficiario de esas cuentas bancarias y fecha dentro del rango. */
  ejemplosSinBeneficiario(cuentasBancarias: string[], rango: RangoDeFechas): Promise<Ejemplo[]>;
  /** `bancos.nombre_para_comparar`: la misma regla de la base, para lo que aún no se guardó. */
  nombreParaComparar(texto: string | null): Promise<string | null>;
}
