import { DatoInvalido } from '../../core/compartido/dominio/errores.js';
import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { ConciliacionCerrada, ConciliacionConDiferencia } from './errores.js';
import { deCentavos } from './centavos.js';

export type ConciliacionId = Identificador<'Conciliacion'>;

/** Año y mes (1 a 12) de una conciliación. */
export interface Periodo {
  anio: number;
  mes: number;
}

/** Lo que el usuario escribe al iniciar una conciliación. */
export interface DatosDeConciliacion extends Periodo {
  cuentaBancariaId: string;
  saldoSegunBanco: string;
}

export interface PropiedadesDeConciliacion extends DatosDeConciliacion {
  id: ConciliacionId;
  empresaId: Identificador<'Empresa'>;
  cerradaEn: Date | null;
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

/** El periodo inmediato siguiente (enero sigue a diciembre del año anterior). */
export function periodoSiguiente({ anio, mes }: Periodo): Periodo {
  return mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 };
}

/**
 * La conciliación de una cuenta con el estado de cuenta del banco, mes por mes.
 * Nace abierta con el saldo que dice el banco; se marcan los movimientos que
 * aparecen en él y solo se cierra con diferencia cero. Cerrada, deja la cuenta
 * conciliada hasta el fin de ese mes (lo hace cumplir `ReglasDeLaCuenta`) y ya
 * no se le cambia el saldo ni las marcas.
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
      cerradaEn: null,
    });
  }

  static reconstruir(propiedades: PropiedadesDeConciliacion): Conciliacion {
    return new Conciliacion(propiedades);
  }

  /** @throws ConciliacionCerrada si ya está cerrada. */
  cambiarSaldoSegunBanco(saldoSegunBanco: string): void {
    this.exigirAbierta();
    this.propiedades = { ...this.propiedades, saldoSegunBanco };
  }

  /**
   * @throws ConciliacionCerrada si ya está cerrada.
   * @throws ConciliacionConDiferencia si la diferencia no es cero.
   */
  cerrar(diferenciaEnCentavos: number): void {
    this.exigirAbierta();
    if (diferenciaEnCentavos !== 0) throw new ConciliacionConDiferencia(deCentavos(diferenciaEnCentavos));
    this.propiedades = { ...this.propiedades, cerradaEn: new Date() };
  }

  get estaCerrada(): boolean {
    return this.propiedades.cerradaEn !== null;
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

  private exigirAbierta(): void {
    if (this.estaCerrada) throw new ConciliacionCerrada();
  }
}
