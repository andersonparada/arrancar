import { DatoInvalido } from '../../core/compartido/dominio/errores.js';
import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { ChequeraDemasiadoGrande } from './errores.js';

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
    });
  }

  static reconstruir(propiedades: PropiedadesDeChequera): Chequera {
    return new Chequera(propiedades);
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
