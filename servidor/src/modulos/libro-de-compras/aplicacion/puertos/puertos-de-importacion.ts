import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import type { DteRecibido } from '../../dominio/dte-recibido.js';

/** Lo que la importación de la SAT lee de la configuración, con el valor que rige para la empresa. */
export interface ConfiguracionDeLaImportacion {
  /** `core.regional.zona_horaria`. */
  zonaHoraria: string;
  /** `core.regional.decimales_montos` (2 a 4). */
  decimales: number;
  /** `libro-de-compras.dte.encabezados_adicionales`: un JSON con títulos de columna extra. */
  encabezadosAdicionales: string;
}

export interface LectorDeConfiguracionDeImportacion {
  paraEmpresa(contexto: ContextoEmpresa): Promise<ConfiguracionDeLaImportacion>;
}

/** Un proveedor de la cuenta que la importación ofrece como el de la fila. */
export interface ProveedorPorNit {
  id: string;
  activo: boolean;
}

/** Las consultas en lote que necesita cargar un archivo; RLS limita todo a la empresa (o cuenta) de la transacción. */
export interface ConsultasParaImportar {
  /** Autorización → documento vigente de la empresa con esa autorización FEL. */
  documentosVigentes(autorizaciones: readonly string[]): Promise<Map<string, string>>;
  /** Las autorizaciones vigentes en otra empresa de la misma cuenta (solo sí o no; nunca dice en cuál). */
  registradasEnOtraEmpresa(autorizaciones: readonly string[]): Promise<Set<string>>;
  /** NIT (normalizado) → proveedor de la cuenta. */
  proveedoresPorNit(nits: readonly string[]): Promise<Map<string, ProveedorPorNit>>;
}

/** Las escrituras en lote de la bandeja al cargar un archivo. */
export interface RepositorioParaImportar {
  /** Las filas de la empresa con esas autorizaciones, bloqueadas hasta el fin de la transacción. */
  existentes(autorizaciones: readonly string[]): Promise<Map<string, DteRecibido>>;
  agregarVarias(filas: readonly DteRecibido[]): Promise<void>;
  /** Guarda los datos de la SAT y el último lote de la fila; el estado y el borrador no se tocan. */
  actualizarDatosDeLaSat(fila: DteRecibido): Promise<void>;
  /** Solo cambia el último lote de las filas que el archivo trajo sin cambios. */
  moverALote(ids: readonly string[], loteId: string): Promise<void>;
}
