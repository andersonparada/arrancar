import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type { DatosFiscalesDeEmpresa } from '../../dominio/datos-fiscales-de-empresa.js';
import type { HistorialFiscalDeEmpresa, VigenciaFiscal } from '../../dominio/historial-fiscal-de-empresa.js';
import type { DatosFiscalesDeProveedor } from '../../dominio/datos-fiscales-de-proveedor.js';

/** `compartir` espera a quien esté guardando el historial; `actualizar` espera a todos (guardar y registrar). */
export type ModoDeBloqueoFiscal = 'actualizar' | 'compartir';

/** El historial fiscal de la empresa de la transacción: una fila por vigencia (escalón). */
export interface RepositorioDeDatosFiscalesDeEmpresa {
  /** Las vigencias de la empresa; vacío si nunca se guardaron datos fiscales. */
  historial(empresaId: string): Promise<HistorialFiscalDeEmpresa>;
  /** Los datos que rigen en un período, o `null` si la empresa no tiene datos guardados. */
  vigenteEn(empresaId: string, periodo: string): Promise<DatosFiscalesDeEmpresa | null>;
  /** Bloquea todas las filas de la empresa hasta el final de la transacción (`select … for update` o `for share`). */
  bloquear(empresaId: string, modo: ModoDeBloqueoFiscal): Promise<void>;
  insertar(empresaId: string, vigencia: VigenciaFiscal): Promise<void>;
  /** Cambia los datos de una vigencia (`id` obligatorio). */
  actualizar(vigencia: VigenciaFiscal): Promise<void>;
  eliminar(id: string): Promise<void>;
}

/** Qué períodos de la empresa de la transacción tienen documentos vigentes (los anulados no cuentan). */
export interface ConsultaDePeriodosConDocumentos {
  /** Primeros días de mes, sin repetir. */
  periodosConDocumentosVigentes(empresaId: string): Promise<string[]>;
}

/** Los datos fiscales de los proveedores de la cuenta de la transacción (una fila por proveedor). */
export interface RepositorioDeDatosFiscalesDeProveedor {
  /** `null` si nunca se guardaron: valen los valores por omisión. */
  buscar(proveedorId: string): Promise<DatosFiscalesDeProveedor | null>;
  /** Crea la fila o cambia la que había. */
  guardar(proveedorId: string, datos: DatosFiscalesDeProveedor): Promise<void>;
  /** Si el proveedor existe en la cuenta de la transacción. */
  existe(proveedorId: string): Promise<boolean>;
}

/** Quién puede trabajar con los datos de una empresa: de la cuenta del operador y a la que tiene acceso. */
export interface AccesoAEmpresas {
  /** @throws RecursoNoEncontrado si la empresa no es de la cuenta o el operador no tiene acceso a ella. */
  exigirAcceso(operador: Operador, empresaId: string): Promise<void>;
}
