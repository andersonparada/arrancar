import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { aCentavos } from './centavos.js';
import { MontoInvalido, MotivoDeAnulacionInvalido, MovimientoAnulado } from './errores.js';

export type MovimientoId = Identificador<'Movimiento'>;

/** Lo que el usuario puede escribir de un movimiento. */
export interface DatosDeMovimiento {
  cuentaBancariaId: string;
  tipo: 'credito' | 'debito';
  fecha: string;
  monto: string;
  saldoInicial: boolean;
  referencia: string | null;
  beneficiario: string | null;
  observaciones: string | null;
}

export interface PropiedadesDeMovimiento extends DatosDeMovimiento {
  id: MovimientoId;
  empresaId: Identificador<'Empresa'>;
  anuladoEn: Date | null;
  motivoDeAnulacion: string | null;
}

const MAXIMO_DEL_MOTIVO = 500;

function datosValidos(datos: DatosDeMovimiento): DatosDeMovimiento {
  if (aCentavos(datos.monto) <= 0) throw new MontoInvalido();
  return datos;
}

/**
 * Una nota de crédito (entra dinero) o de débito (sale). El monto siempre es
 * positivo: el tipo dice la dirección. Nada se borra: se anula con su motivo.
 */
export class Movimiento extends Entidad<MovimientoId> {
  private constructor(private propiedades: PropiedadesDeMovimiento) {
    super(propiedades.id);
  }

  static crear(empresaId: Identificador<'Empresa'>, datos: DatosDeMovimiento): Movimiento {
    return new Movimiento({
      ...datosValidos(datos),
      empresaId,
      id: Identificador.nuevo(),
      anuladoEn: null,
      motivoDeAnulacion: null,
    });
  }

  static reconstruir(propiedades: PropiedadesDeMovimiento): Movimiento {
    return new Movimiento(propiedades);
  }

  /**
   * Corrige sus datos; la cuenta no cambia (para eso se anula y se registra en la otra).
   * @throws MovimientoAnulado si ya está anulado.
   */
  corregir(datos: DatosDeMovimiento): void {
    this.exigirVigente();
    const { cuentaBancariaId } = this.propiedades;
    this.propiedades = { ...this.propiedades, ...datosValidos({ ...datos, cuentaBancariaId }) };
  }

  /** @throws MovimientoAnulado si ya está anulado; MotivoDeAnulacionInvalido si falta el motivo. */
  anular(motivo: string): void {
    this.exigirVigente();
    const motivoDeAnulacion = motivo.trim();
    if (!motivoDeAnulacion || motivoDeAnulacion.length > MAXIMO_DEL_MOTIVO) throw new MotivoDeAnulacionInvalido();
    this.propiedades = { ...this.propiedades, anuladoEn: new Date(), motivoDeAnulacion };
  }

  get estaAnulado(): boolean {
    return this.propiedades.anuladoEn !== null;
  }

  /** Cuánto mueve el saldo de su cuenta, en centavos: positivo si entra, negativo si sale, cero si está anulado. */
  get efectoEnCentavos(): number {
    if (this.estaAnulado) return 0;
    const monto = aCentavos(this.propiedades.monto);
    return this.propiedades.tipo === 'credito' ? monto : -monto;
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeMovimiento> {
    return { ...this.propiedades };
  }

  private exigirVigente(): void {
    if (this.estaAnulado) throw new MovimientoAnulado();
  }
}
