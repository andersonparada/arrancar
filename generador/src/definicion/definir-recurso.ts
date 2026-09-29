import {
  FORMA_DE_CAMPO,
  FORMA_DE_CLAVE,
  FORMA_DE_ENTIDAD,
  nombresDeClave,
  nombresDeCodigo,
  type Nombres,
} from '../nombres.js';
import { siNo, type Campo } from './campos.js';
import { DefinicionInvalida } from './errores.js';

/** Las secciones del menú de cada módulo, en el orden en que se muestran. */
export type SeccionDelMenu = 'operacion' | 'administracion' | 'reportes';

/** Si el recurso importa y/o exporta en Excel; lo decide la sección, ver `EXCEL_POR_SECCION`. */
export interface ExcelDelRecurso {
  importar: boolean;
  exportar: boolean;
}

/**
 * Regla del dueño del producto: administración importa y exporta (catálogos y
 * datos maestros se cargan y se revisan en lote); operación no importa ni
 * exporta (lo que se registra a diario se consulta luego en los reportes);
 * reportes solo exporta (se consultan e imprimen, no se cargan por Excel).
 */
const EXCEL_POR_SECCION: Record<SeccionDelMenu, ExcelDelRecurso> = {
  administracion: { importar: true, exportar: true },
  operacion: { importar: false, exportar: false },
  reportes: { importar: false, exportar: true },
};

/** Lo que escribe quien define un recurso. */
export interface EntradaDeRecurso {
  modulo: string;
  /** Nombre de código en singular: `Animal`, `CategoriaDeProveedor`. */
  entidad: string;
  /** Nombre de código en plural: `Animales`, `CategoriasDeProveedor`. */
  plural: string;
  /** Qué ve el usuario, con tildes: `{ singular: 'categoría de proveedor', plural: 'categorías de proveedor' }`. */
  textos?: { singular: string; plural: string };
  /** Para "Nuevo animal" o "Nueva categoría". */
  genero?: 'masculino' | 'femenino';
  /** De quién son los registros: de cada empresa o de toda la cuenta. */
  alcance: 'empresa' | 'cuenta';
  /** `catalogo`: lista con ventana. `completa`: lista, formulario en página y ficha. */
  pantalla: 'catalogo' | 'completa';
  /**
   * En qué sección del menú de su módulo va la pantalla: `operacion` para el
   * trabajo del día (movimientos, registros), `administracion` para catálogos y
   * datos maestros, `reportes` para consultar.
   */
  seccion: SeccionDelMenu;
  /** `eliminar` borra de verdad; `inactivar` conserva el historial. */
  baja?: 'eliminar' | 'inactivar';
  /** El campo que nombra al registro en listas y títulos; por omisión, el primer texto requerido. */
  mostrar?: string;
  /** Ícono de lucide-vue-next para su opción del menú; por omisión, `List`. */
  icono?: string;
  campos: Record<string, Campo>;
}

export interface CampoDefinido {
  nombre: Nombres;
  /** Como se llama en el código: el nombre, o `potreroId` si apunta a otra entidad. */
  nombreEnCodigo: string;
  etiqueta: string;
  campo: Campo;
  /** A qué recurso apunta un campo de referencia; lo completa el comando al cargar las definiciones. */
  referida?: DefinicionDeRecurso;
}

/** La definición validada y con todos los nombres que necesitan las plantillas. */
export interface DefinicionDeRecurso {
  modulo: Nombres;
  entidad: Nombres;
  plural: Nombres;
  textos: { singular: string; plural: string };
  genero: 'masculino' | 'femenino';
  alcance: 'empresa' | 'cuenta';
  pantalla: 'catalogo' | 'completa';
  seccion: SeccionDelMenu;
  baja: 'eliminar' | 'inactivar';
  mostrar: string;
  icono: string;
  campos: CampoDefinido[];
  excel: ExcelDelRecurso;
  permisos: { ver: string; crear: string; editar: string; eliminar?: string; importar?: string; exportar?: string };
}

function problemasDeNombres(entrada: EntradaDeRecurso): string[] {
  const problemas: string[] = [];
  if (!FORMA_DE_CLAVE.test(entrada.modulo))
    problemas.push(`El módulo "${entrada.modulo}" debe ir en minúsculas con guiones.`);
  if (!FORMA_DE_ENTIDAD.test(entrada.entidad))
    problemas.push(`La entidad "${entrada.entidad}" debe ir como Animal o CategoriaDeProveedor.`);
  if (!FORMA_DE_ENTIDAD.test(entrada.plural)) problemas.push(`El plural "${entrada.plural}" debe ir como Animales.`);
  return problemas;
}

/** Lo que cada tipo exige de sus opciones. */
function problemaDelTipo(nombre: string, campo: Campo): string | undefined {
  switch (campo.tipo) {
    case 'lista':
      return Object.keys(campo.opciones).length > 0 ? undefined : `La lista "${nombre}" no tiene opciones.`;
    case 'decimal':
      return campo.decimales >= 1 && campo.decimales <= 4 ? undefined : `"${nombre}" lleva de 1 a 4 decimales.`;
    case 'referencia':
      return problemaDeReferencia(nombre, campo.entidad);
    default:
      return undefined;
  }
}

function problemaDeReferencia(nombre: string, entidad: string): string | undefined {
  if (!FORMA_DE_ENTIDAD.test(entidad)) return `"${nombre}" apunta a una entidad mal escrita.`;
  if (nombre.endsWith('Id'))
    return `"${nombre}" va sin "Id": el generador lo agrega (${nombre.slice(0, -2)} → ${nombre}).`;
  return undefined;
}

/** Columnas que pone el generador; un campo no puede llamarse así. */
const NOMBRES_RESERVADOS = ['id', 'empresaId', 'cuentaId', 'activo', 'creadoEn', 'actualizadoEn'];

function problemaDelNombre(nombre: string): string | undefined {
  if (NOMBRES_RESERVADOS.includes(nombre)) return `"${nombre}" lo pone el generador; use otro nombre de campo.`;
  return FORMA_DE_CAMPO.test(nombre) ? undefined : `El campo "${nombre}" debe ir como arete o fechaDeNacimiento.`;
}

function problemasDeUnCampo(nombre: string, campo: Campo): string[] {
  return [problemaDelNombre(nombre), problemaDelTipo(nombre, campo)].filter((problema) => problema !== undefined);
}

function problemasDeCampos(entrada: EntradaDeRecurso): string[] {
  const nombres = Object.keys(entrada.campos);
  if (nombres.length === 0) return ['El recurso no tiene campos.'];
  const problemas = nombres.flatMap((nombre) => problemasDeUnCampo(nombre, entrada.campos[nombre]!));
  return [...problemas, ...problemasDeReferenciasAsiMisma(entrada), ...problemasDeMostrar(entrada)];
}

/** El campo que nombra al registro: debe existir y ser un dato propio, no una referencia. */
function problemasDeMostrar({ mostrar, campos }: EntradaDeRecurso): string[] {
  if (!mostrar) return campoQueNombra(campos) ? [] : ['Indique en "mostrar" qué campo nombra al registro.'];
  if (!campos[mostrar]) return [`"mostrar" nombra un campo que no existe: ${mostrar}.`];
  if (campos[mostrar].tipo === 'referencia') return [`"mostrar" no puede ser una referencia: ${mostrar}.`];
  return [];
}

/** Una entidad que apunta a sí misma (la madre de un animal) no puede exigirlo: el primero no tendría a quién. */
const problemasDeReferenciasAsiMisma = ({ entidad, campos }: EntradaDeRecurso) =>
  Object.entries(campos)
    .filter(([, campo]) => campo.tipo === 'referencia' && campo.entidad === entidad && campo.requerido)
    .map(([nombre]) => `"${nombre}" apunta a la misma entidad: debe ser opcional.`);

/** El primer texto requerido: suele ser el nombre, el arete o el código. */
const campoQueNombra = (campos: Record<string, Campo>) =>
  Object.entries(campos).find(([, campo]) => campo.tipo === 'texto' && campo.requerido)?.[0];

const campoDefinido = ([nombre, campo]: [string, Campo]): CampoDefinido => ({
  nombre: nombresDeCodigo(nombre),
  nombreEnCodigo: campo.tipo === 'referencia' ? `${nombre}Id` : nombre,
  etiqueta: campo.etiqueta ?? nombresDeCodigo(nombre).legible,
  campo,
});

/** Si la baja es por inactivación, el recurso lleva `activo`, que se trata como un campo más. */
const conActivo = (entrada: EntradaDeRecurso): Record<string, Campo> =>
  entrada.baja === 'inactivar' ? { ...entrada.campos, activo: siNo({ predeterminado: true }) } : entrada.campos;

/**
 * Ver, crear y editar (inactivar y reactivar van con editar), eliminar solo si la baja es
 * por eliminación, y aparte importar y exportar (ver una lista no da derecho a llevársela
 * entera): solo los que la sección permite, ver `EXCEL_POR_SECCION`.
 */
const permisosDe = (prefijo: string, excel: ExcelDelRecurso, baja: 'eliminar' | 'inactivar') => ({
  ver: `${prefijo}.ver`,
  crear: `${prefijo}.crear`,
  editar: `${prefijo}.editar`,
  ...(baja === 'eliminar' ? { eliminar: `${prefijo}.eliminar` } : {}),
  ...(excel.importar ? { importar: `${prefijo}.importar` } : {}),
  ...(excel.exportar ? { exportar: `${prefijo}.exportar` } : {}),
});

function completar(entrada: EntradaDeRecurso): DefinicionDeRecurso {
  const modulo = nombresDeClave(entrada.modulo);
  const plural = nombresDeCodigo(entrada.plural);
  const entidad = nombresDeCodigo(entrada.entidad);
  const excel = EXCEL_POR_SECCION[entrada.seccion];
  return {
    modulo,
    entidad,
    plural,
    textos: entrada.textos ?? { singular: entidad.legible.toLowerCase(), plural: plural.legible.toLowerCase() },
    genero: entrada.genero ?? 'masculino',
    alcance: entrada.alcance,
    pantalla: entrada.pantalla,
    seccion: entrada.seccion,
    baja: entrada.baja ?? 'eliminar',
    mostrar: entrada.mostrar ?? campoQueNombra(entrada.campos)!,
    icono: entrada.icono ?? 'List',
    campos: Object.entries(conActivo(entrada)).map(campoDefinido),
    excel,
    permisos: permisosDe(`${modulo.clave}.${plural.clave}`, excel, entrada.baja ?? 'eliminar'),
  };
}

/**
 * Valida la definición de un recurso y la completa con sus nombres, textos y
 * permisos. Si algo está mal, avisa de todos los problemas juntos.
 */
export function definirRecurso(entrada: EntradaDeRecurso): DefinicionDeRecurso {
  const problemas = [...problemasDeNombres(entrada), ...problemasDeCampos(entrada)];
  if (problemas.length > 0) throw new DefinicionInvalida(problemas);
  return completar(entrada);
}
