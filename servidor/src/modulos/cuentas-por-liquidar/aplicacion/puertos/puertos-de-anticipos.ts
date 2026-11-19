import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import type { Anticipo, ClaseDeAnticipo, EstadoDeAnticipo, FormaDeAnticipo } from '../../dominio/anticipos.js';

/** El anticipo listo para guardar: el id lo genera el caso de uso porque es el origen del movimiento de Bancos. */
export interface AnticipoNuevo {
  id: string;
  numero: number;
  anioDeNumero: number;
  beneficiarioId: string;
  beneficiario: string;
  esEmpleado: boolean;
  beneficiarioUsuarioId: string | null;
  clase: ClaseDeAnticipo;
  descripcion: string;
  localidadId: string | null;
  fecha: string;
  fechaLimite: string;
  montoCentavos: number;
  forma: FormaDeAnticipo;
  movimientoId: string;
  motivoConVencidos: string | null;
}

/** Cómo se anula un anticipo guardado. */
export interface AnulacionDeAnticipo {
  anuladoPor: string;
  motivo: string;
  /** `AAAA-MM-DD`: la fecha contable de la anulación. */
  fechaDeAnulacion: string;
}

export interface RepositorioDeAnticipos {
  agregar(anticipo: AnticipoNuevo): Promise<void>;
  buscar(id: string): Promise<Anticipo | null>;
  /** Igual que `buscar`, y deja la fila bloqueada para este caso de uso. */
  bloquear(id: string): Promise<Anticipo | null>;
  /** El anticipo cuya entrega, devolución o reembolso es este movimiento de Bancos; también si está anulado. */
  delMovimiento(movimientoId: string): Promise<Anticipo | null>;
  /** Lo deja `anulado` con quién, cuándo, por qué y la fecha contable. */
  anular(id: string, anulacion: AnulacionDeAnticipo): Promise<void>;
}

/** Lo gastado de un anticipo: cuántos gastos vigentes tiene y lo que suman (las notas de crédito restan). */
export interface GastadoDelAnticipo {
  cantidad: number;
  totalCentavos: number;
}

/** Un anticipo abierto de un beneficiario con la fecha límite pasada. */
export interface AnticipoVencido {
  numero: number;
  anioDeNumero: number;
}

export interface FiltroDeAnticipos {
  /** Sin `corte`: el estado de hoy; `todos` no filtra. */
  estado: EstadoDeAnticipo | 'todos';
  /** Los anticipos por liquidar a esa fecha: de esa fecha o antes, vigentes y aún abiertos entonces. */
  corte?: string;
  beneficiarioId?: string;
  /** Solo los abiertos con la fecha límite pasada (a la fecha de corte o a hoy). */
  vencidos: boolean;
  /** Hoy, para decidir los vencidos cuando no hay corte. */
  hoy: string;
  pagina: number;
  limite: number;
}

export interface FilaDeAnticipo {
  anticipo: Anticipo;
  cuentaBancariaId: string;
  /** El número del cheque o el de la nota de Bancos. */
  numeroDelDocumento: number;
  /** Lo gastado, al corte si se pidió; si no, hoy. */
  gastadoCentavos: number;
}

export interface PaginaDeAnticipos {
  filas: FilaDeAnticipo[];
  total: number;
  /** La suma de lo que falta por justificar de todo lo filtrado. */
  totalPorJustificarCentavos: number;
}

export interface ConsultasDeAnticipos {
  gastadoDe(anticipoId: string): Promise<GastadoDelAnticipo>;
  /** Los anticipos abiertos del beneficiario cuya fecha límite es anterior a `hoy`, por número. */
  vencidosDe(beneficiarioId: string, hoy: string): Promise<AnticipoVencido[]>;
  listar(filtro: FiltroDeAnticipos): Promise<PaginaDeAnticipos>;
}

/** Lo que el anticipo necesita saber de otras tablas para validar lo que se escribe (con seguridad por cuenta y empresa). */
export interface ReferenciasDelAnticipo {
  /** El nombre del tercero si es de la cuenta y está activo; `null` si no. */
  nombreDelTercero(terceroId: string): Promise<string | null>;
  /** El usuario debe estar activo y entrar a la empresa del contexto. */
  usuarioDeLaEmpresa(usuarioId: string): Promise<boolean>;
  localidadDeLaEmpresa(localidadId: string): Promise<boolean>;
}

/** La configuración que decide cómo se entrega un anticipo (empresa → instalación → predeterminado). */
export interface PoliticaDeAnticipos {
  /** Los días que se dan para liquidar si no se escribe la fecha límite. */
  diasParaLiquidar(contexto: ContextoEmpresa): Promise<number>;
  /** Entregar a quien tiene vencidos pide el permiso de excepción. */
  bloquearConVencidos(contexto: ContextoEmpresa): Promise<boolean>;
}
