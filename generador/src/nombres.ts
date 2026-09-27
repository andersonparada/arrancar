/** Clave de módulo o de recurso: minúsculas, números y guiones (`moneda-extranjera`). */
export const FORMA_DE_CLAVE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/** Nombre de entidad o de su plural en código: `Animal`, `CategoriaDeProveedor`. */
export const FORMA_DE_ENTIDAD = /^[A-Z][A-Za-z0-9]*$/;

/** Nombre de campo en código: `arete`, `fechaDeNacimiento`. */
export const FORMA_DE_CAMPO = /^[a-z][A-Za-z0-9]*$/;

const palabrasDeClave = (clave: string) => clave.split('-');
const palabrasDePascal = (nombre: string) => nombre.split(/(?=[A-Z])/).map((palabra) => palabra.toLowerCase());
const conMayuscula = (palabra: string) => palabra.charAt(0).toUpperCase() + palabra.slice(1);

/** Las formas de un mismo nombre que usa el código generado. */
export interface Nombres {
  /** `moneda-extranjera`: carpetas, rutas y permisos. */
  clave: string;
  /** `MonedaExtranjera`: clases y tipos. */
  pascal: string;
  /** `monedaExtranjera`: variables e instancias. */
  camel: string;
  /** `MONEDA_EXTRANJERA`: constantes. */
  constante: string;
  /** `moneda_extranjera`: esquemas y tablas de PostgreSQL. */
  serpiente: string;
  /** `Moneda extranjera`: lo que lee el usuario cuando no se da otro texto. */
  legible: string;
}

function nombresDePalabras(palabras: string[]): Nombres {
  const pascal = palabras.map(conMayuscula).join('');
  return {
    clave: palabras.join('-'),
    pascal,
    camel: pascal.charAt(0).toLowerCase() + pascal.slice(1),
    constante: palabras.join('_').toUpperCase(),
    serpiente: palabras.join('_'),
    legible: conMayuscula(palabras.join(' ')),
  };
}

/** Desde una clave con guiones: `moneda-extranjera`. */
export const nombresDeClave = (clave: string): Nombres => nombresDePalabras(palabrasDeClave(clave));

/** Desde un nombre de código: `CategoriaDeProveedor` o `fechaDeNacimiento`. */
export const nombresDeCodigo = (nombre: string): Nombres => nombresDePalabras(palabrasDePascal(nombre));
