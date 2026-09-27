import type { DefinicionDeRecurso } from './definicion/definir-recurso.js';

const ARTICULOS = {
  masculino: { un: 'un', el: 'el', del: 'del', los: 'los' },
  femenino: { un: 'una', el: 'la', del: 'de la', los: 'las' },
} as const;

const conMayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/** Los nombres de código del recurso y de su módulo, en todas sus formas. */
function valoresDeNombres({ entidad, plural, modulo }: DefinicionDeRecurso): Record<string, string> {
  return {
    Entidad: entidad.pascal,
    entidad: entidad.camel,
    entidadClave: entidad.clave,
    entidadSerpiente: entidad.serpiente,
    Plural: plural.pascal,
    plural: plural.camel,
    pluralClave: plural.clave,
    pluralSerpiente: plural.serpiente,
    Modulo: modulo.pascal,
    moduloClave: modulo.clave,
    moduloSerpiente: modulo.serpiente,
  };
}

/** Lo que lee el usuario, con artículos que concuerdan: "un animal", "la categoría". */
function valoresDeTextos({ textos, genero, alcance }: DefinicionDeRecurso): Record<string, string> {
  const articulo = ARTICULOS[genero];
  return {
    Singular: conMayuscula(textos.singular),
    unSingular: `${articulo.un} ${textos.singular}`,
    ElSingular: conMayuscula(`${articulo.el} ${textos.singular}`),
    delSingular: `${articulo.del} ${textos.singular}`,
    pluralTexto: textos.plural,
    losPlural: `${articulo.los} ${textos.plural}`,
    LosPlural: conMayuscula(`${articulo.los} ${textos.plural}`),
    Alcance: conMayuscula(alcance),
    alcance,
    laEmpresaOCuenta: `la ${alcance}`,
  };
}

/**
 * Los huecos comunes a todas las plantillas del recurso, del servidor y del
 * cliente. `nombreModulo` es el que ve el usuario (sale del `modulo.ts`).
 */
export function valoresDelRecurso(definicion: DefinicionDeRecurso, nombreModulo: string): Record<string, string> {
  const mostrar = definicion.campos.find((campo) => campo.nombre.camel === definicion.mostrar)!;
  return {
    ...valoresDeNombres(definicion),
    ...valoresDeTextos(definicion),
    nombreModulo,
    campoMostrar: definicion.mostrar,
    etiquetaMostrar: mostrar.etiqueta.toLowerCase(),
    permisoVer: definicion.permisos.ver,
    permisoGestionar: definicion.permisos.gestionar,
  };
}
