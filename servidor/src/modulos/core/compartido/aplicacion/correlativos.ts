import type { ContextoEmpresa } from './contexto-empresa.js';

/** Número consecutivo asignado y el año al que pertenece (0 si el correlativo no se reinicia por año). */
export interface NumeroAsignado {
  numero: number;
  anio: number;
}

/**
 * Consecutivos internos de comprobantes por empresa y clave (`<modulo>.<recurso>`, como
 * `bancos.notas_de_credito`). Se usa dentro de la unidad de trabajo del caso de uso: si la
 * operación falla y se deshace, el número también, así que no quedan huecos por errores.
 * Los huecos que sí pueden quedar (al eliminar un registro) los explica la auditoría.
 */
export interface Correlativos {
  /**
   * El siguiente número de la clave para la empresa del contexto. `fecha` (`AAAA-MM-DD`) es la del
   * documento: solo cuenta si la empresa reinicia el correlativo cada año.
   */
  siguiente(clave: string, fecha: string): Promise<NumeroAsignado>;
}

/** Decide si la empresa reinicia sus correlativos cada año (`core.correlativos.reinicio_anual`). */
export interface PoliticaDeReinicioAnual {
  aplica(contexto: ContextoEmpresa): Promise<boolean>;
}
