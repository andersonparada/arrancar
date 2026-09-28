import { DatoInvalido } from '../../core/compartido/dominio/errores.js';
import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';

export type CuentaBancariaId = Identificador<'CuentaBancaria'>;

/** Lo que el usuario puede escribir de una cuenta bancaria. */
export interface DatosDeCuentaBancaria {
  nombre: string;
  bancoId: string;
  numero: string;
  tipo: 'monetaria' | 'ahorro';
  observaciones: string | null;
  activo: boolean;
}

export interface PropiedadesDeCuentaBancaria extends DatosDeCuentaBancaria {
  id: CuentaBancariaId;
  empresaId: Identificador<'Empresa'>;
}

/** Un dato de la cuenta bancaria no cumple sus reglas. */
export class CuentaBancariaInvalido extends DatoInvalido {
  readonly codigo = 'cuenta_bancaria_invalido';
}

/** Recorta el texto y exige que no quede vacío. */
function textoObligatorio(texto: string, campo: string): string {
  const limpio = texto.trim();
  if (!limpio) throw new CuentaBancariaInvalido(`Escriba "${campo}".`);
  return limpio;
}

/** Los textos obligatorios no pueden quedar vacíos. */
function datosValidos(datos: DatosDeCuentaBancaria): DatosDeCuentaBancaria {
  return {
    ...datos,
    nombre: textoObligatorio(datos.nombre, 'Nombre corto'),
    numero: textoObligatorio(datos.numero, 'Número de cuenta'),
  };
}

/** Cuenta bancaria de la empresa. Sus reglas van aquí, en el dominio. */
export class CuentaBancaria extends Entidad<CuentaBancariaId> {
  private constructor(private propiedades: PropiedadesDeCuentaBancaria) {
    super(propiedades.id);
  }

  static crear(empresaId: Identificador<'Empresa'>, datos: DatosDeCuentaBancaria): CuentaBancaria {
    return new CuentaBancaria({ ...datosValidos(datos), empresaId, id: Identificador.nuevo() });
  }

  static reconstruir(propiedades: PropiedadesDeCuentaBancaria): CuentaBancaria {
    return new CuentaBancaria(propiedades);
  }

  cambiarDatos(datos: DatosDeCuentaBancaria): void {
    this.propiedades = { ...this.propiedades, ...datosValidos(datos) };
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeCuentaBancaria> {
    return { ...this.propiedades };
  }
}
