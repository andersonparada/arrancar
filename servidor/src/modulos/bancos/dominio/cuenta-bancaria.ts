import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';
import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { normalizarNumeroDeCuenta } from './numero-de-cuenta.js';

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
  /** El número sin separadores y en mayúsculas: solo sirve para la unicidad y para comparar. */
  numeroNormalizado: string;
}

/** Un dato de la cuenta bancaria no cumple sus reglas. */
export class CuentaBancariaInvalido extends DatoInvalido {
  readonly codigo = 'cuenta_bancaria_invalido';
}

/** Ya hay otra cuenta con el mismo número (sin contar guiones ni espacios) en el mismo banco. */
export class NumeroDeCuentaRepetido extends ReglaDeNegocioInfringida {
  readonly codigo = 'numero_de_cuenta_repetido';

  constructor(numero: string) {
    super(`Ya existe la cuenta ${numero} en ese banco.`);
  }
}

/** Recorta el texto y exige que no quede vacío. */
function textoObligatorio(texto: string, campo: string): string {
  const limpio = texto.trim();
  if (!limpio) throw new CuentaBancariaInvalido(`Escriba "${campo}".`);
  return limpio;
}

/** Los textos obligatorios no pueden quedar vacíos; el número guarda además su forma normalizada. */
function datosValidos(datos: DatosDeCuentaBancaria): DatosDeCuentaBancaria & { numeroNormalizado: string } {
  const numero = textoObligatorio(datos.numero, 'Número de cuenta');
  const numeroNormalizado = normalizarNumeroDeCuenta(numero);
  if (!numeroNormalizado) throw new CuentaBancariaInvalido('El número de cuenta debe tener letras o dígitos.');
  return { ...datos, nombre: textoObligatorio(datos.nombre, 'Nombre corto'), numero, numeroNormalizado };
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
