import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { CuentaInvalida, CuentaNoEsDeDetalle } from './errores.js';
import type { MascaraDeCuentas } from './mascara-de-cuentas.js';
import { datosDeCuentaValidos, type DatosDeCuenta } from './reglas-de-cuenta.js';

export type CuentaId = Identificador<'Cuenta'>;

export type { DatosDeCuenta } from './reglas-de-cuenta.js';

export interface PropiedadesDeCuenta extends DatosDeCuenta {
  id: CuentaId;
  empresaId: Identificador<'Empresa'>;
  padreId: CuentaId | null;
  /** Cuántos grupos tiene su código. */
  nivel: number;
  /** Para Multimoneda: nulo = quetzales. */
  monedaCodigo: string | null;
}

/** Dónde queda la cuenta en el árbol: la máscara de la empresa y su cuenta superior (nula en el primer nivel). */
export interface UbicacionDeCuenta {
  mascara: MascaraDeCuentas;
  padre: Cuenta | null;
}

/** Cuenta de la nomenclatura de la empresa. Sus reglas van aquí, en el dominio. */
export class Cuenta extends Entidad<CuentaId> {
  private constructor(private propiedades: PropiedadesDeCuenta) {
    super(propiedades.id);
  }

  /** @throws CodigoFueraDeLaMascara, CuentaInvalida o CuentaNoEsDeDetalle si no cumple las reglas. */
  static crear(empresaId: Identificador<'Empresa'>, datos: DatosDeCuenta, ubicacion: UbicacionDeCuenta): Cuenta {
    const validos = datosDeCuentaValidos(datos);
    const nivel = Cuenta.nivelBajo(validos, ubicacion);
    return new Cuenta({
      ...validos,
      empresaId,
      id: Identificador.nuevo(),
      padreId: ubicacion.padre?.id ?? null,
      nivel,
      monedaCodigo: null,
    });
  }

  static reconstruir(propiedades: PropiedadesDeCuenta): Cuenta {
    return new Cuenta(propiedades);
  }

  /** El código no cambia: de él dependen el nivel y la cuenta superior. */
  cambiarDatos(datos: DatosDeCuenta, ubicacion: UbicacionDeCuenta): void {
    const validos = datosDeCuentaValidos(datos);
    if (validos.codigo !== this.propiedades.codigo)
      throw new CuentaInvalida('El código de una cuenta no se cambia: cree la cuenta nueva y inactive esta.');
    Cuenta.nivelBajo(validos, ubicacion);
    this.propiedades = { ...this.propiedades, ...validos };
  }

  get esDeDetalle(): boolean {
    return this.propiedades.esDeDetalle;
  }

  get activo(): boolean {
    return this.propiedades.activo;
  }

  /** Las cuentas de los roles de auxiliar quedan de control; devuelve si hubo que marcarla. */
  marcarDeControl(): boolean {
    if (this.propiedades.esDeControl) return false;
    this.propiedades = { ...this.propiedades, esDeControl: true };
    return true;
  }

  get codigo(): string {
    return this.propiedades.codigo;
  }

  get tipo(): DatosDeCuenta['tipo'] {
    return this.propiedades.tipo;
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeCuenta> {
    return { ...this.propiedades };
  }

  /** Revisa el código contra la máscara y la cuenta superior; devuelve el nivel. */
  private static nivelBajo(datos: DatosDeCuenta, { mascara, padre }: UbicacionDeCuenta): number {
    const nivel = mascara.nivelDe(datos.codigo);
    const codigoDelPadre = mascara.codigoDelPadre(datos.codigo);
    if (!padre) {
      if (codigoDelPadre) throw new CuentaInvalida(`Falta la cuenta superior ${codigoDelPadre}.`);
      return nivel;
    }
    if (padre.codigo !== codigoDelPadre) throw new CuentaInvalida('La cuenta superior no corresponde a su código.');
    if (padre.esDeDetalle) throw new CuentaNoEsDeDetalle();
    if (padre.tipo !== datos.tipo)
      throw new CuentaInvalida('La cuenta debe ser del mismo tipo que su cuenta superior.');
    return nivel;
  }
}
