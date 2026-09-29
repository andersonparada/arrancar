import { DatoInvalido } from '../../core/compartido/dominio/errores.js';
import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';

export type LocalidadId = Identificador<'Localidad'>;

/** Lo que el usuario puede escribir de una localidad. */
export interface DatosDeLocalidad {
  codigo: string;
  nombre: string;
  tipoId: string;
  codigoEstablecimientoSat: number | null;
  nombreComercialSat: string | null;
  departamentoCodigo: string | null;
  municipioCodigo: string | null;
  direccion: string | null;
  activo: boolean;
}

export interface PropiedadesDeLocalidad extends DatosDeLocalidad {
  id: LocalidadId;
  empresaId: Identificador<'Empresa'>;
}

/** Un dato de la localidad no cumple sus reglas. */
export class LocalidadInvalido extends DatoInvalido {
  readonly codigo = 'localidad_invalido';
}

const FORMA_DEL_CODIGO = /^[A-Z0-9-]{1,12}$/;

/** Recorta el texto y exige que no quede vacío. */
function textoObligatorio(texto: string, campo: string): string {
  const limpio = texto.trim();
  if (!limpio) throw new LocalidadInvalido(`Escriba "${campo}".`);
  return limpio;
}

/** El código interno va en mayúsculas, con letras, números y guiones (hasta 12). */
function codigoValido(texto: string): string {
  const codigo = textoObligatorio(texto, 'Código interno').toUpperCase();
  if (!FORMA_DEL_CODIGO.test(codigo))
    throw new LocalidadInvalido('El código interno lleva de 1 a 12 letras, números o guiones.');
  return codigo;
}

const textoOpcional = (texto: string | null) => texto?.trim() || null;

/** Los datos de la SAT son opcionales, pero el nombre comercial no se entiende sin su establecimiento. */
function datosDeLaSat(
  datos: DatosDeLocalidad,
): Pick<DatosDeLocalidad, 'codigoEstablecimientoSat' | 'nombreComercialSat'> {
  const { codigoEstablecimientoSat: codigo } = datos;
  const nombreComercialSat = textoOpcional(datos.nombreComercialSat);
  if (codigo !== null && (!Number.isInteger(codigo) || codigo <= 0))
    throw new LocalidadInvalido('El código de establecimiento SAT es un número entero mayor que cero.');
  if (nombreComercialSat && codigo === null)
    throw new LocalidadInvalido('Para el nombre comercial SAT escriba el código de establecimiento SAT.');
  return { codigoEstablecimientoSat: codigo, nombreComercialSat };
}

/** Departamento y municipio van juntos o ninguno. */
function ubicacionValida(datos: DatosDeLocalidad): Pick<DatosDeLocalidad, 'departamentoCodigo' | 'municipioCodigo'> {
  const { departamentoCodigo, municipioCodigo } = datos;
  if ((departamentoCodigo === null) !== (municipioCodigo === null))
    throw new LocalidadInvalido('Elija el departamento y el municipio, o ninguno de los dos.');
  return { departamentoCodigo, municipioCodigo };
}

/** Normaliza y valida lo que escribe el usuario. */
function datosValidos(datos: DatosDeLocalidad): DatosDeLocalidad {
  return {
    ...datos,
    codigo: codigoValido(datos.codigo),
    nombre: textoObligatorio(datos.nombre, 'Nombre'),
    ...datosDeLaSat(datos),
    ...ubicacionValida(datos),
    direccion: textoOpcional(datos.direccion),
  };
}

/** Localidad de la empresa. Sus reglas van aquí, en el dominio. */
export class Localidad extends Entidad<LocalidadId> {
  private constructor(private propiedades: PropiedadesDeLocalidad) {
    super(propiedades.id);
  }

  static crear(empresaId: Identificador<'Empresa'>, datos: DatosDeLocalidad): Localidad {
    return new Localidad({ ...datosValidos(datos), empresaId, id: Identificador.nuevo() });
  }

  static reconstruir(propiedades: PropiedadesDeLocalidad): Localidad {
    return new Localidad(propiedades);
  }

  cambiarDatos(datos: DatosDeLocalidad): void {
    this.propiedades = { ...this.propiedades, ...datosValidos(datos) };
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeLocalidad> {
    return { ...this.propiedades };
  }
}
