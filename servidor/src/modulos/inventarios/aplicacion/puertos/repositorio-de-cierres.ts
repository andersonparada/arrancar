import type { CierreGuardado } from '../../dominio/cierre/cierre-guardado.js';
import type { RenglonDelCierre, TotalesDelCierre } from '../../dominio/cierre/existencias-del-cierre.js';
import type { MetodoDeCosteo } from '../../dominio/costeo/tipos.js';

/** Lo que se guarda al cerrar un mes: el cierre con sus totales y todos los renglones de su foto. */
export interface CierreNuevo {
  empresaId: string;
  periodo: string;
  cerradoPor: string;
  ahora: Date;
  metodo: MetodoDeCosteo;
  regimenIsr: string | null;
  totales: TotalesDelCierre;
  renglones: readonly RenglonDelCierre[];
}

export interface Reapertura {
  periodo: string;
  usuarioId: string;
  ahora: Date;
  motivo: string;
}

/** Un renglón de la foto de un mes con los nombres que se muestran; cantidad, costo y valor como los guarda la base. */
export interface ExistenciaAlCierreGuardada {
  articuloId: string;
  articuloCodigo: string;
  articuloNombre: string;
  bodegaId: string;
  bodegaNombre: string;
  tipoDeInventario: string;
  enTransitoInterno: boolean;
  cantidad: string;
  costoUnitario: string;
  valor: string;
}

/** Guarda y recupera los cierres mensuales y sus fotos. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioDeCierres {
  /**
   * El candado **exclusivo** del cierre de la empresa, hasta el final de la transacción: es el mismo que los documentos
   * toman compartido, así que nadie mueve el kardex mientras se cierra o se reabre un mes, ni dos cierres a la vez.
   */
  bloquear(): Promise<void>;
  /** El período (`aaaa-mm-01`) del último mes cerrado, o `null` si no hay cierres. */
  ultimoMesCerrado(): Promise<string | null>;
  buscar(periodo: string): Promise<CierreGuardado | null>;
  /** Todos los cierres, del más reciente al más antiguo. */
  listar(): Promise<CierreGuardado[]>;
  /** Crea el cierre del mes (o vuelve a cerrar uno reabierto) con su foto vigente. */
  guardar(cierre: CierreNuevo): Promise<void>;
  /** Pone el cierre en `reabierto` y deja su foto como no vigente; no borra nada. */
  reabrir(reapertura: Reapertura): Promise<void>;
  /** La foto vigente del mes, de las bodegas que el usuario ve. */
  existencias(periodo: string): Promise<ExistenciaAlCierreGuardada[]>;
  /** El valor de la foto vigente del mes por tipo de inventario, de todas las bodegas. */
  totalesPorTipo(periodo: string): Promise<TotalesDelCierre['porTipo']>;
}
