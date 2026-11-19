import { DatoInvalido } from '../../core/compartido/dominio/errores.js';
import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { ChequeraDemasiadoGrande } from './errores.js';
import { ChequeraDeAperturaSinFormato } from './errores-de-impresion.js';
import type { ClaveDePlantilla } from './formatos-de-cheque/plantillas.js';

export type ChequeraId = Identificador<'Chequera'>;

/** Lo que el usuario puede escribir de una chequera. */
export interface DatosDeChequera {
  cuentaBancariaId: string;
  serie: string | null;
  desde: number;
  hasta: number;
}

export interface PropiedadesDeChequera extends DatosDeChequera {
  id: ChequeraId;
  empresaId: Identificador<'Empresa'>;
  activa: boolean;
  /** La que crea el sistema para los cheques de la carga inicial: solo tiene los que se cargan y nunca está activa. */
  deApertura: boolean;
  /** Cómo se imprimen sus cheques: un formato de la cuenta suscriptora o una plantilla de fábrica sin ajustes; a lo sumo uno. */
  formatoDeChequeId: string | null;
  plantillaDeCheque: ClaveDePlantilla | null;
}

/** Cómo se imprime: un formato guardado o una plantilla de fábrica (o ninguno). */
export interface FormatoDeLaChequera {
  formatoDeChequeId: string | null;
  plantillaDeCheque: ClaveDePlantilla | null;
}

/** Un dato de la chequera no cumple sus reglas. */
export class ChequeraInvalida extends DatoInvalido {
  readonly codigo = 'chequera_invalida';
}

/** Una serie en blanco cuenta como sin serie. */
function serieNormalizada(serie: string | null): string | null {
  const limpia = serie?.trim() ?? '';
  return limpia ? limpia : null;
}

function datosValidos(datos: DatosDeChequera, maximo: number): DatosDeChequera {
  if (!Number.isInteger(datos.desde) || datos.desde <= 0) {
    throw new ChequeraInvalida('El número inicial debe ser un entero mayor que cero.');
  }
  if (!Number.isInteger(datos.hasta) || datos.hasta < datos.desde) {
    throw new ChequeraInvalida('El número final debe ser un entero mayor o igual que el inicial.');
  }
  const cantidad = datos.hasta - datos.desde + 1;
  if (cantidad > maximo) throw new ChequeraDemasiadoGrande(maximo);
  return { ...datos, serie: serieNormalizada(datos.serie) };
}

/**
 * Rango de cheques (de `desde` a `hasta`, en una serie opcional) de una cuenta
 * bancaria. Al crearla, el caso de uso inserta todos sus cheques como
 * disponibles. No se borra: se inactiva o se reactiva.
 */
export class Chequera extends Entidad<ChequeraId> {
  private constructor(private propiedades: PropiedadesDeChequera) {
    super(propiedades.id);
  }

  /** @throws ChequeraInvalida si el rango no es válido; ChequeraDemasiadoGrande si excede el máximo configurado. */
  static crear(empresaId: Identificador<'Empresa'>, datos: DatosDeChequera, maximoDeCheques: number): Chequera {
    return new Chequera({
      ...datosValidos(datos, maximoDeCheques),
      empresaId,
      id: Identificador.nuevo(),
      activa: true,
      deApertura: false,
      formatoDeChequeId: null,
      plantillaDeCheque: null,
    });
  }

  /**
   * La chequera de apertura de una serie: la crea el sistema al cargar el primer cheque de la carga inicial. Nace
   * inactiva y con solo ese número; el rango lo mantiene quien carga cheques.
   */
  static deApertura(
    empresaId: Identificador<'Empresa'>,
    datos: { cuentaBancariaId: string; serie: string | null; numero: number },
  ): Chequera {
    const { cuentaBancariaId, serie, numero } = datos;
    return new Chequera({
      cuentaBancariaId,
      serie: serieNormalizada(serie),
      desde: numero,
      hasta: numero,
      empresaId,
      id: Identificador.nuevo(),
      activa: false,
      deApertura: true,
      formatoDeChequeId: null,
      plantillaDeCheque: null,
    });
  }

  static reconstruir(propiedades: PropiedadesDeChequera): Chequera {
    return new Chequera(propiedades);
  }

  /**
   * Elige cómo se imprimen sus cheques. Un formato guardado o una plantilla, no los dos; la chequera de la carga inicial
   * nunca se imprime.
   * @throws ChequeraInvalida si pide los dos; ChequeraDeAperturaSinFormato si es de la carga inicial.
   */
  asignarFormato({ formatoDeChequeId, plantillaDeCheque }: FormatoDeLaChequera): void {
    if (this.propiedades.deApertura) throw new ChequeraDeAperturaSinFormato();
    if (formatoDeChequeId && plantillaDeCheque) {
      throw new ChequeraInvalida('Elija un formato o una plantilla de fábrica, no los dos.');
    }
    this.propiedades = { ...this.propiedades, formatoDeChequeId, plantillaDeCheque };
  }

  /** El formato con que se imprime, o `null` si todavía no tiene. */
  get formato(): FormatoDeLaChequera {
    const { formatoDeChequeId, plantillaDeCheque } = this.propiedades;
    return { formatoDeChequeId, plantillaDeCheque };
  }

  inactivar(): void {
    this.propiedades = { ...this.propiedades, activa: false };
  }

  reactivar(): void {
    this.propiedades = { ...this.propiedades, activa: true };
  }

  get estaActiva(): boolean {
    return this.propiedades.activa;
  }

  get esDeApertura(): boolean {
    return this.propiedades.deApertura;
  }

  /** Cómo se nombra en un mensaje: «de la carga inicial» o su serie y rango. */
  get descripcion(): string {
    if (this.propiedades.deApertura) return 'de la carga inicial';
    const { serie, desde, hasta } = this.propiedades;
    return `${serie ?? ''}${desde}-${hasta}`;
  }

  /** Todos los números del rango, de `desde` a `hasta`. */
  get numeros(): number[] {
    const { desde, hasta } = this.propiedades;
    return Array.from({ length: hasta - desde + 1 }, (_, indice) => desde + indice);
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeChequera> {
    return { ...this.propiedades };
  }
}
