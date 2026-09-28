import { DatoInvalido } from '../../core/compartido/dominio/errores.js';
import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { AutorizaQuienElaboro, ConciliacionNoEstaElaborada, ConciliacionNoEstaEnProceso } from './errores.js';

export type ConciliacionId = Identificador<'Conciliacion'>;

/** en_proceso: se marca. elaborada: la terminó quien concilia. autorizada: otra persona la autorizó y bloqueó el mes. */
export type EstadoDeConciliacion = 'en_proceso' | 'elaborada' | 'autorizada';

/** Año y mes (1 a 12) de una conciliación. */
export interface Periodo {
  anio: number;
  mes: number;
}

/** Lo que el usuario escribe al iniciar una conciliación: ya no escribe ningún saldo. */
export interface DatosDeConciliacion extends Periodo {
  cuentaBancariaId: string;
}

/** Los saldos y totales que se congelan al autorizar (columnas `numeric(14,2)` de la tabla). */
export interface FotoDelCalculo {
  saldoSegunLibros: string;
  saldoCalculadoEstadoDeCuenta: string;
  totalChequesEnCirculacion: string;
  totalOtrosDebitosEnTransito: string;
  totalCreditosEnTransito: string;
}

export interface PropiedadesDeConciliacion extends DatosDeConciliacion {
  id: ConciliacionId;
  empresaId: Identificador<'Empresa'>;
  estado: EstadoDeConciliacion;
  elaboradaPor: string | null;
  elaboradaEn: Date | null;
  autorizadaPor: string | null;
  autorizadaEn: Date | null;
  foto: FotoDelCalculo | null;
}

/** El año o el mes de una conciliación no son válidos. */
export class PeriodoInvalido extends DatoInvalido {
  readonly codigo = 'periodo_invalido';
}

function datosValidos(datos: DatosDeConciliacion): DatosDeConciliacion {
  if (!Number.isInteger(datos.mes) || datos.mes < 1 || datos.mes > 12) {
    throw new PeriodoInvalido('El mes debe ser un número entre 1 y 12.');
  }
  if (!Number.isInteger(datos.anio) || datos.anio < 2000 || datos.anio > 2100) {
    throw new PeriodoInvalido('El año no es válido.');
  }
  return datos;
}

/** El último día del mes del periodo, `AAAA-MM-DD`. */
export function finDelMesDe({ anio, mes }: Periodo): string {
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
}

/** El primer día del mes del periodo, `AAAA-MM-DD`. */
export function inicioDelMesDe({ anio, mes }: Periodo): string {
  return `${anio}-${String(mes).padStart(2, '0')}-01`;
}

/** El periodo inmediato siguiente (enero sigue a diciembre del año anterior). */
export function periodoSiguiente({ anio, mes }: Periodo): Periodo {
  return mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 };
}

/** El periodo inmediato anterior (diciembre precede a enero del año siguiente). */
export function periodoAnterior({ anio, mes }: Periodo): Periodo {
  return mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
}

/**
 * La conciliación de una cuenta con el estado de cuenta del banco, mes por mes.
 * El usuario no escribe ningún saldo: solo marca qué documentos aparecen en el
 * estado de cuenta y el sistema arma el documento (cuadro cuadrático y partidas
 * detalladas). Flujo: `en_proceso` (se marca) → `elaborada` (quien concilia la
 * termina; ya no se cambian las marcas salvo que se devuelva) → `autorizada`
 * (otra persona, con permiso aparte; congela la foto del cálculo y bloquea el
 * mes en `ReglasDeLaCuenta`).
 */
export class Conciliacion extends Entidad<ConciliacionId> {
  private constructor(private propiedades: PropiedadesDeConciliacion) {
    super(propiedades.id);
  }

  /** @throws PeriodoInvalido si el año o el mes no son válidos. */
  static crear(empresaId: Identificador<'Empresa'>, datos: DatosDeConciliacion): Conciliacion {
    return new Conciliacion({
      ...datosValidos(datos),
      empresaId,
      id: Identificador.nuevo(),
      estado: 'en_proceso',
      elaboradaPor: null,
      elaboradaEn: null,
      autorizadaPor: null,
      autorizadaEn: null,
      foto: null,
    });
  }

  static reconstruir(propiedades: PropiedadesDeConciliacion): Conciliacion {
    return new Conciliacion(propiedades);
  }

  /** La da por terminada quien la elaboró: ya no se le cambian las marcas. @throws ConciliacionNoEstaEnProceso */
  elaborar(usuarioId: string): void {
    this.exigirEnProceso();
    this.propiedades = { ...this.propiedades, estado: 'elaborada', elaboradaPor: usuarioId, elaboradaEn: new Date() };
  }

  /**
   * Congela la foto del cálculo y bloquea el mes.
   * @throws ConciliacionNoEstaElaborada si no está elaborada.
   * @throws AutorizaQuienElaboro si autoriza quien la elaboró.
   */
  autorizar(usuarioId: string, foto: FotoDelCalculo): void {
    this.exigirElaborada();
    if (this.propiedades.elaboradaPor === usuarioId) throw new AutorizaQuienElaboro();
    this.propiedades = {
      ...this.propiedades,
      estado: 'autorizada',
      autorizadaPor: usuarioId,
      autorizadaEn: new Date(),
      foto,
    };
  }

  /** Regresa la conciliación a en_proceso para volver a marcar. @throws ConciliacionNoEstaElaborada */
  devolver(): void {
    this.exigirElaborada();
    this.propiedades = { ...this.propiedades, estado: 'en_proceso', elaboradaPor: null, elaboradaEn: null };
  }

  get estado(): EstadoDeConciliacion {
    return this.propiedades.estado;
  }

  get estaEnProceso(): boolean {
    return this.propiedades.estado === 'en_proceso';
  }

  get estaElaborada(): boolean {
    return this.propiedades.estado === 'elaborada';
  }

  get estaAutorizada(): boolean {
    return this.propiedades.estado === 'autorizada';
  }

  get periodo(): Periodo {
    const { anio, mes } = this.propiedades;
    return { anio, mes };
  }

  /** El último día de su mes, `AAAA-MM-DD`. */
  finDelMes(): string {
    return finDelMesDe(this.periodo);
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeConciliacion> {
    return { ...this.propiedades };
  }

  private exigirEnProceso(): void {
    if (!this.estaEnProceso) throw new ConciliacionNoEstaEnProceso();
  }

  private exigirElaborada(): void {
    if (!this.estaElaborada) throw new ConciliacionNoEstaElaborada();
  }
}
