import { RaizAgregado } from '../../compartido/dominio/entidad.js';
import { Identificador, type CuentaId } from '../../compartido/dominio/identificador.js';
import { DatoInvalido } from '../../compartido/dominio/errores.js';

const LARGO_MAXIMO_DEL_NOMBRE = 120;

export class NombreDeCuentaInvalido extends DatoInvalido {
  readonly codigo = 'nombre_de_cuenta_invalido';

  constructor(nombre: string) {
    super(`El nombre "${nombre}" no es válido: escriba de 1 a 120 caracteres.`);
  }
}

export interface PropiedadesDeCuenta {
  id: CuentaId;
  nombre: string;
  /** Una cuenta suspendida conserva sus datos, pero nadie puede trabajar en sus empresas. */
  activa: boolean;
}

export type CambiosDeCuenta = Partial<Pick<PropiedadesDeCuenta, 'nombre' | 'activa'>>;

function nombreValido(nombre: string): string {
  const limpio = nombre.trim();
  if (!limpio || limpio.length > LARGO_MAXIMO_DEL_NOMBRE) throw new NombreDeCuentaInvalido(nombre);
  return limpio;
}

/** Suscriptor del SaaS (una familia o un cliente): agrupa empresas y contrata módulos. */
export class Cuenta extends RaizAgregado<CuentaId> {
  private constructor(private propiedades: PropiedadesDeCuenta) {
    super(propiedades.id);
  }

  static registrar(nombre: string): Cuenta {
    return new Cuenta({ id: Identificador.nuevo(), nombre: nombreValido(nombre), activa: true });
  }

  static reconstruir(propiedades: PropiedadesDeCuenta): Cuenta {
    return new Cuenta(propiedades);
  }

  cambiar({ nombre, activa }: CambiosDeCuenta): void {
    if (nombre !== undefined) this.propiedades = { ...this.propiedades, nombre: nombreValido(nombre) };
    if (activa !== undefined) this.propiedades = { ...this.propiedades, activa };
  }

  instantanea(): Readonly<PropiedadesDeCuenta> {
    return { ...this.propiedades };
  }
}
