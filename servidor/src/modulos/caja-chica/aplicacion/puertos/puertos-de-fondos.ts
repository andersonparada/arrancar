import type {
  CambioDeMonto,
  CustodioDelFondo,
  Fondo,
  FormaDeCambioDeMonto,
  TipoDeCambioDeMonto,
  UsoDelFondo,
} from '../../dominio/fondos.js';

export interface FondoNuevo {
  id: string;
  nombre: string;
  localidadId: string | null;
  topeCentavos: number | null;
  cuentaBancariaId: string | null;
  fechaDeApertura: string;
}

/** Lo que se puede cambiar de un fondo; lo que no viene no se toca y `null` limpia. */
export interface CambiosDelFondo {
  nombre?: string;
  localidadId?: string | null;
  topeCentavos?: number | null;
  cuentaBancariaId?: string | null;
}

export interface CierreDelFondo {
  fecha: string;
  cerradoPor: string;
  motivo: string;
}

export interface CustodioNuevo {
  fondoId: string;
  custodio: string;
  custodioUsuarioId: string | null;
  desde: string;
  motivoDelCambio: string | null;
}

export interface CambioNuevo {
  fondoId: string;
  tipo: TipoDeCambioDeMonto;
  forma: FormaDeCambioDeMonto;
  fecha: string;
  montoCentavos: number;
  movimientoId: string | null;
}

export interface AnulacionDelCambio {
  anuladoPor: string;
  motivo: string;
  fechaDeAnulacion: string;
}

/** Un cambio de monto con el fondo al que pertenece. */
export interface CambioConSuFondo {
  fondoId: string;
  cambio: CambioDeMonto;
}

/** Las tablas tienen seguridad por empresa y por alcance de fondo (RLS). */
export interface RepositorioDeFondos {
  agregar(fondo: FondoNuevo): Promise<void>;
  buscar(id: string): Promise<Fondo | null>;
  /** Igual que `buscar`, y deja la fila bloqueada para este caso de uso. */
  bloquear(id: string): Promise<Fondo | null>;
  actualizar(id: string, cambios: CambiosDelFondo): Promise<void>;
  /** Lo deja `cerrado` con quién, cuándo y por qué. */
  cerrar(id: string, cierre: CierreDelFondo): Promise<void>;
  /** Hay otro fondo con ese nombre (sin distinguir mayúsculas ni tildes). */
  existeElNombre(nombre: string, exceptoId?: string): Promise<boolean>;
  agregarCustodio(custodio: CustodioNuevo): Promise<void>;
  /** Cierra el custodio vigente: su `hasta` es la fecha. */
  cerrarCustodioVigente(fondoId: string, hasta: string): Promise<void>;
  custodios(fondoId: string): Promise<CustodioDelFondo[]>;
  agregarCambio(cambio: CambioNuevo): Promise<string>;
  cambios(fondoId: string): Promise<CambioDeMonto[]>;
  anularCambio(cambioId: string, anulacion: AnulacionDelCambio): Promise<void>;
  /** El cambio de monto que respalda este cheque o nota de Bancos (también anulado). */
  cambioDelMovimiento(movimientoId: string): Promise<CambioConSuFondo | null>;
}

export interface FiltroDeFondos {
  estado: 'abierto' | 'cerrado' | 'todos';
  localidadId?: string;
  pagina: number;
  limite: number;
}

/** Lo que la lista y la ficha muestran de un fondo y no está en su fila. */
export interface DatosDeLectura {
  custodio: string | null;
  custodioUsuarioId: string | null;
  localidadNombre: string | null;
  /** La cuenta bancaria que se propone al reponer, si el fondo la tiene. */
  cuentaBancariaNombre: string | null;
  montoCentavos: number;
  pendienteCentavos: number;
  valesCentavos: number;
  /** La fecha del vale provisional abierto más viejo, si hay alguno. */
  valeMasViejo: string | null;
  ultimoArqueo: string | null;
  aperturaAnulada: boolean;
  /** Comprobantes vigentes con un documento anulado por su emisor, por resolver o en disputa. */
  documentosPorResolver: number;
}

export interface ConsultasDeFondos {
  /** Los fondos que ve el usuario, por nombre, con el total sin paginar. */
  listar(filtro: FiltroDeFondos): Promise<{ filas: Fondo[]; total: number }>;
  /** Todo lo de lectura de cada fondo en pocas consultas (no una por fondo). */
  datosDeLectura(ids: readonly string[]): Promise<Map<string, DatosDeLectura>>;
  usoDelFondo(id: string): Promise<UsoDelFondo>;
}

/** Lee de `core`: el usuario debe estar activo y entrar a la empresa del contexto. */
export interface CustodiosDeFondos {
  nombreDelUsuario(usuarioId: string): Promise<string | null>;
}

/** Que lo que se elige exista y esté a la vista (RLS): si no, «no existe o no tiene acceso». */
export interface ReferenciasDeFondos {
  exigirLocalidad(localidadId: string | null | undefined): Promise<void>;
  exigirCuentaBancaria(cuentaBancariaId: string | null | undefined): Promise<void>;
}

export interface MovimientosDeFondos {
  /** La fecha del movimiento de Bancos (la del inverso se lee aquí). */
  fechaDe(movimientoId: string): Promise<string | null>;
}
