import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import type { AjusteDeSaldo, CausaDeAjuste } from '../../dominio/ajustes.js';
import type { DocumentoPorPagar } from '../../dominio/documento-por-pagar.js';

/** Lo que se guarda de un ajuste nuevo; nace `vigente`. */
export interface AjusteNuevo {
  montoCentavos: number;
  /** `AAAA-MM-DD`. */
  fecha: string;
  causa: CausaDeAjuste;
  motivo: string;
  referencia: string | null;
}

/** Cómo se anula un ajuste. */
export interface AnulacionDeAjuste {
  anuladoPor: string;
  motivo: string;
}

export interface RepositorioDeAjustes {
  /** Guarda el ajuste de la nota como `vigente` y devuelve su id. */
  agregar(nota: DocumentoPorPagar, ajuste: AjusteNuevo): Promise<string>;
  /** El ajuste con su nota; `null` si no existe en la empresa. */
  buscar(id: string): Promise<AjusteDeSaldo | null>;
  /** Lo deja `anulado` con quién, cuándo y por qué; el saldo libre vuelve a la nota. */
  anular(id: string, anulacion: AnulacionDeAjuste): Promise<void>;
}

/** El monto máximo de un ajuste con causa «diferencia menor» (configuración de la empresa). */
export interface TopeDeDiferenciaMenor {
  /** El tope de la empresa, en centavos; 0 apaga la causa. */
  centavos(contexto: ContextoEmpresa): Promise<number>;
}
