import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type { Comprobante } from '../../dominio/comprobantes.js';
import type { LineaDeReposicion, Reposicion } from '../../dominio/reposiciones.js';
import type { SeparacionDeFuncionesConfigurada } from '../../dominio/reglas-de-reposiciones.js';

/** Una reposición por guardar: su `id` ya se usó como documento de origen del cheque o la nota. */
export interface ReposicionNueva {
  id: string;
  fondoId: string;
  numero: number;
  anioDeNumero: number;
  fecha: string;
  forma: 'cheque' | 'nota_de_debito';
  montoCentavos: number;
  movimientoId: string;
  custodio: string;
  laHizoElCustodio: boolean;
  lineas: LineaDeReposicion[];
}

export interface AnulacionDeLaReposicion {
  anuladoPor: string;
  motivo: string;
  fechaDeAnulacion: string;
}

/** Las tablas tienen seguridad por empresa y por alcance del fondo (RLS). */
export interface RepositorioDeReposiciones {
  agregar(nueva: ReposicionNueva): Promise<void>;
  buscar(id: string): Promise<Reposicion | null>;
  /** Igual que `buscar`, y deja la fila bloqueada para este caso de uso. */
  bloquear(id: string): Promise<Reposicion | null>;
  /** La reposición que respalda este cheque o nota de Bancos (también anulada). */
  delMovimiento(movimientoId: string): Promise<Reposicion | null>;
  lineas(reposicionId: string): Promise<LineaDeReposicion[]>;
  /** La deja `anulada` y sus líneas `vigente = false`: los comprobantes vuelven a pendientes. */
  anular(id: string, anulacion: AnulacionDeLaReposicion): Promise<void>;
}

export interface ConsultasDeReposiciones {
  /** Las reposiciones del fondo, la más reciente primero. */
  delFondo(fondoId: string): Promise<Reposicion[]>;
  /** Los comprobantes que cubre una reposición (también si se anuló), con su contexto. */
  comprobantesDe(reposicionId: string): Promise<Comprobante[]>;
  /** Los comprobantes vigentes del fondo que no están en una reposición vigente. */
  pendientesDelFondo(fondoId: string): Promise<Comprobante[]>;
}

/** Los comprobantes que se reponen, leídos con bloqueo para que nadie los cambie a la vez. */
export interface ComprobantesParaReponer {
  /** Los que existen y se ven, entre los ids pedidos; los deja bloqueados (por id, para no cruzar bloqueos). */
  bloquear(ids: readonly string[]): Promise<Comprobante[]>;
}

/** Lo que Caja chica lee de los movimientos de Bancos sin pasar por una orden. */
export interface ConciliacionDeMovimientos {
  /** El banco ya pagó el cheque o la nota (está conciliado). */
  estaConciliado(movimientoId: string): Promise<boolean>;
}

/** Lo que Libro de compras debe saber de la reposición: cuándo un documento ya se procesó (orden `marcar_procesado`). */
export interface LibroParaReponer {
  marcarProcesado(operador: Operador, documentoId: string, procesado: boolean): Promise<void>;
}

export interface ConfiguracionDeControl {
  separacionDeFunciones(operador: Operador): Promise<SeparacionDeFuncionesConfigurada>;
}
