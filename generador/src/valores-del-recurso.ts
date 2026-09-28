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
    ENTIDAD: entidad.constante,
    entidad: entidad.camel,
    entidadClave: entidad.clave,
    entidadSerpiente: entidad.serpiente,
    Plural: plural.pascal,
    plural: plural.camel,
    pluralClave: plural.clave,
    pluralSerpiente: plural.serpiente,
    Modulo: modulo.pascal,
    MODULO: modulo.constante,
    moduloClave: modulo.clave,
    moduloSerpiente: modulo.serpiente,
    /** Nombre de la ruta de la lista; las demás le agregan `.nuevo`, `.ficha` o `.editar`. */
    rutaNombre: `${modulo.clave}.${plural.clave}`,
  };
}

/** Lo que lee el usuario, con artículos que concuerdan: "un animal", "la categoría". */
function valoresDeTextos({ textos, genero, alcance }: DefinicionDeRecurso): Record<string, string> {
  const articulo = ARTICULOS[genero];
  const o = genero === 'femenino' ? 'a' : 'o';
  return {
    /** Terminación que concuerda: "registrad{{o}}", "Nuev{{o}}". */
    o,
    singular: textos.singular,
    Singular: conMayuscula(textos.singular),
    tituloNuevo: `Nuev${o} ${textos.singular}`,
    tituloEditar: `Editar ${textos.singular}`,
    PluralTitulo: conMayuscula(textos.plural),
    unSingular: `${articulo.un} ${textos.singular}`,
    elSingular: `${articulo.el} ${textos.singular}`,
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
    icono: definicion.icono,
    campoMostrar: definicion.mostrar,
    etiquetaMostrar: mostrar.etiqueta.toLowerCase(),
    permisoVer: definicion.permisos.ver,
    permisoGestionar: definicion.permisos.gestionar,
    permisoImportar: definicion.permisos.importar,
    permisoExportar: definicion.permisos.exportar,
  };
}
