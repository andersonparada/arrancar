import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { ClaseConPorcentajeSobreElMaximo, ClaseInvalido } from './errores.js';
import { esTerreno, type IncisoFiscal } from './incisos-fiscales.js';

export { ClaseInvalido };

export type ClaseId = Identificador<'Clase'>;

/** Lo que el usuario puede escribir de una clase de activo. Los porcentajes viajan como texto con dos decimales. */
export interface DatosDeClase {
  nombre: string;
  incisoFiscal: IncisoFiscal;
  porcentajeFiscal: string;
  vidaUtilContableMeses: number | null;
  valorResidualPorcentaje: string;
  activo: boolean;
}

/** El máximo de ley (en %) del inciso de la clase; los terrenos no tienen. */
export interface TopeDeLey {
  porcentajeMaximo: number;
}

export interface PropiedadesDeClase extends DatosDeClase {
  id: ClaseId;
  empresaId: Identificador<'Empresa'>;
}

const VIDA_UTIL_MAXIMA = 1200;
const RESIDUAL_MAXIMO = 99.99;

/** Recorta el texto y exige que no quede vacío ni pase de 80 caracteres. */
function nombreValido(nombre: string): string {
  const limpio = nombre.trim();
  if (!limpio) throw new ClaseInvalido('Escriba "Nombre".');
  if (limpio.length > 80) throw new ClaseInvalido('El nombre no puede pasar de 80 caracteres.');
  return limpio;
}

function validarVidaUtil({ incisoFiscal, vidaUtilContableMeses: vida }: DatosDeClase): void {
  if (vida === null) return;
  if (esTerreno(incisoFiscal)) throw new ClaseInvalido('Los terrenos no se deprecian: no llevan vida útil.');
  if (!Number.isInteger(vida) || vida < 1 || vida > VIDA_UTIL_MAXIMA)
    throw new ClaseInvalido(`La vida útil va de 1 a ${VIDA_UTIL_MAXIMA} meses.`);
}

function validarPorcentajes(datos: DatosDeClase, tope: TopeDeLey): void {
  const fiscal = Number(datos.porcentajeFiscal);
  const residual = Number(datos.valorResidualPorcentaje);
  if (!(fiscal >= 0 && fiscal <= 100)) throw new ClaseInvalido('El porcentaje fiscal va de 0 a 100.');
  if (esTerreno(datos.incisoFiscal) !== (fiscal === 0))
    throw new ClaseInvalido('Los terrenos llevan porcentaje fiscal 0 y los demás incisos, más de 0.');
  if (fiscal > tope.porcentajeMaximo) throw new ClaseConPorcentajeSobreElMaximo(tope.porcentajeMaximo);
  if (!(residual >= 0 && residual <= RESIDUAL_MAXIMO))
    throw new ClaseInvalido(`El valor residual va de 0 a ${RESIDUAL_MAXIMO} %.`);
}

function datosValidos(datos: DatosDeClase, tope: TopeDeLey): DatosDeClase {
  validarVidaUtil(datos);
  validarPorcentajes(datos, tope);
  return { ...datos, nombre: nombreValido(datos.nombre) };
}

/** Clase de activo de la empresa. Sus reglas van aquí, en el dominio. */
export class Clase extends Entidad<ClaseId> {
  private constructor(private propiedades: PropiedadesDeClase) {
    super(propiedades.id);
  }

  /** @throws ClaseConPorcentajeSobreElMaximo si el porcentaje pasa del máximo de ley del inciso. */
  static crear(empresaId: Identificador<'Empresa'>, datos: DatosDeClase, tope: TopeDeLey): Clase {
    return new Clase({ ...datosValidos(datos, tope), empresaId, id: Identificador.nuevo() });
  }

  static reconstruir(propiedades: PropiedadesDeClase): Clase {
    return new Clase(propiedades);
  }

  /** Cambiar el porcentaje o la vida no toca a los activos que ya tiene la clase: conservan los suyos. */
  cambiarDatos(datos: DatosDeClase, tope: TopeDeLey): void {
    this.propiedades = { ...this.propiedades, ...datosValidos(datos, tope) };
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeClase> {
    return { ...this.propiedades };
  }
}
