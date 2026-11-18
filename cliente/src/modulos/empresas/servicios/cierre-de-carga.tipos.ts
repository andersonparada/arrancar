/** Lo que encontró cada módulo al revisar la carga inicial; los textos ya vienen armados por el servidor. */
export interface HallazgoDeCierre {
  codigo: string;
  nivel: 'pide_motivo' | 'aviso';
  mensaje: string;
  registro: { id: string; nombre: string } | null;
}

export interface CifraDelCuadre {
  clave: string;
  etiqueta: string;
  tipo: 'monto' | 'cantidad';
  /** Monto con dos decimales y signo (`-120.00`) o cantidad entera. */
  valor: string;
  /** `null` es un total del módulo. */
  registro: { id: string; nombre: string } | null;
}

export interface RevisionDeCierreDeModulo {
  nombreDelModulo: string;
  resumen: string | null;
  /** Pantalla donde se corrige, p. ej. `/bancos/saldos-iniciales`. */
  ruta: string | null;
  hallazgos: HallazgoDeCierre[];
  cifras: CifraDelCuadre[];
}

/** El balance de apertura firmado (PDF) adjunto a la carga; nunca trae la ruta del archivo. */
export interface BalanceDeApertura {
  tamanoBytes: number;
  paginas: number;
  sha256: string;
  nombreOriginal: string | null;
  subidoEn: string;
  subidoPorNombre: string | null;
}

/** Lo que dijo el último cierre; `null` mientras la carga esté abierta. */
export interface UltimoCierre {
  diferencias: number;
  /** `null` si quien mira no puede ver los cierres: el servidor no lo manda. */
  avisos: number | null;
  /** `null` si no hubo motivo o si quien mira no puede ver los cierres. */
  motivo: string | null;
  /** Falso en las cargas cerradas antes de que se guardara la revisión. */
  revisionGuardada: boolean;
}

export interface CargaInicial {
  empresaId: string;
  /** `aaaa-mm-dd`; sin fecha mientras nadie la registre. */
  fechaDeInicio: string | null;
  cerrada: boolean;
  cerradaEn: string | null;
  cerradaPor: string | null;
  ultimoCierre: UltimoCierre | null;
  balanceDeApertura: BalanceDeApertura | null;
}

/** La revisión que se ve antes de cerrar. */
export interface RevisionDeCierre {
  carga: CargaInicial;
  modulos: RevisionDeCierreDeModulo[];
  diferencias: number;
  avisos: number;
  pideMotivo: boolean;
  /** Si cambia entre revisar y cerrar, el servidor rechaza el cierre. */
  huella: string;
}

export type AccionDelHistorial = 'cerrar' | 'reabrir' | 'quitar' | 'adjuntar';

export interface EntradaDelHistorial {
  id: string;
  accion: AccionDelHistorial;
  fecha: string;
  porNombre: string | null;
  motivo: string | null;
  diferencias: number | null;
  avisos: number | null;
}

/** La revisión de un cierre tal como la vio quien cerró. */
export interface CierreGuardado {
  id: string;
  empresaId: string;
  fechaDeInicio: string;
  cerradaEn: string;
  cerradaPor: string | null;
  motivo: string | null;
  diferencias: number;
  avisos: number;
  huella: string;
  modulos: RevisionDeCierreDeModulo[];
  balanceDeApertura: BalanceDeApertura | null;
}
