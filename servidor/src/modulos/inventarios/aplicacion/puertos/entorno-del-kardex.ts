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
 * Los cierres mensuales los crea INV-8; mientras no existan, ningún mes está cerrado. Cuando lleguen, esta pregunta
 * lee `inventarios.cierres` y los candados de cierre (compartido para los documentos, exclusivo para cerrar) ya están
 * tomados en `AlmacenDelKardex.bloquear`.
 */
export interface MesesCerrados {
  estaCerrado(periodo: string): Promise<boolean>;
}

/** El método con que arranca la empresa si nadie lo eligió: `inventarios.costeo.metodo_inicial`. */
export interface LectorDelMetodoInicial {
  paraEmpresa(operador: Operador): Promise<MetodoDeCosteo>;
}
