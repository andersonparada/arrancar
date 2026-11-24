import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type { MetodoDeCosteo } from '../../dominio/costeo/tipos.js';

/** La fecha de inicio de la empresa (`null` si todavía no tiene) y si su carga inicial ya se cerró. */
export interface EstadoDeLaCarga {
  fechaDeInicio: string | null;
  cerrada: boolean;
}

/** La carga inicial de la empresa activa, que vive en Empresas (se pregunta por el mediador). */
export interface CargaInicial {
  obtener(operador: Operador): Promise<EstadoDeLaCarga>;
}

/**
 * Los cierres mensuales del inventario (`inventarios.cierres`, INV-8). Las dos preguntas toman antes el candado compartido
 * del cierre: quien cierra o reabre lo toma exclusivo, así que lo que responden no cambia hasta el fin de la transacción.
 */
export interface MesesCerrados {
  estaCerrado(periodo: string): Promise<boolean>;
  /** Si ya existe algún cierre mensual (con uno, los saldos iniciales y la fecha de inicio ya no se tocan). */
  hayAlguno(): Promise<boolean>;
  /**
   * Lo mismo que `hayAlguno`, pero sin tomar el candado del cierre. Para quien ya tiene tomada la fila de la carga
   * inicial en otra dirección (el aviso del cambio de fecha de inicio): esa fila ya lo serializa con `CerrarMes`.
   */
  hayAlgunoSinCandado(): Promise<boolean>;
}

/** El método con que arranca la empresa si nadie lo eligió: `inventarios.costeo.metodo_inicial`. */
export interface LectorDelMetodoInicial {
  paraEmpresa(operador: Operador): Promise<MetodoDeCosteo>;
}

/** Si los traslados de la empresa pasan por «en tránsito»: `inventarios.traslados.con_transito` (§6.7). */
export interface LectorDeTransito {
  conTransito(operador: Operador): Promise<boolean>;
}
