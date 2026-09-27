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
  etiqueta: string;
  campo: Campo;
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
  baja: 'eliminar' | 'inactivar';
  mostrar: string;
  icono: string;
  campos: CampoDefinido[];
  permisos: { ver: string; gestionar: string };
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
      return FORMA_DE_ENTIDAD.test(campo.entidad) ? undefined : `"${nombre}" apunta a una entidad mal escrita.`;
    default:
      return undefined;
  }
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
  if (entrada.mostrar && !nombres.includes(entrada.mostrar))
    problemas.push(`"mostrar" nombra un campo que no existe: ${entrada.mostrar}.`);
  if (!entrada.mostrar && !campoQueNombra(entrada.campos))
    problemas.push('Indique en "mostrar" qué campo nombra al registro.');
  return problemas;
}

/** El primer texto requerido: suele ser el nombre, el arete o el código. */
const campoQueNombra = (campos: Record<string, Campo>) =>
  Object.entries(campos).find(([, campo]) => campo.tipo === 'texto' && campo.requerido)?.[0];

const campoDefinido = ([nombre, campo]: [string, Campo]): CampoDefinido => ({
  nombre: nombresDeCodigo(nombre),
  etiqueta: campo.etiqueta ?? nombresDeCodigo(nombre).legible,
  campo,
});

/** Si la baja es por inactivación, el recurso lleva `activo`, que se trata como un campo más. */
const conActivo = (entrada: EntradaDeRecurso): Record<string, Campo> =>
  entrada.baja === 'inactivar' ? { ...entrada.campos, activo: siNo({ predeterminado: true }) } : entrada.campos;

function completar(entrada: EntradaDeRecurso): DefinicionDeRecurso {
  const modulo = nombresDeClave(entrada.modulo);
  const plural = nombresDeCodigo(entrada.plural);
  const entidad = nombresDeCodigo(entrada.entidad);
  return {
    modulo,
    entidad,
    plural,
    textos: entrada.textos ?? { singular: entidad.legible.toLowerCase(), plural: plural.legible.toLowerCase() },
    genero: entrada.genero ?? 'masculino',
    alcance: entrada.alcance,
    pantalla: entrada.pantalla,
    baja: entrada.baja ?? 'eliminar',
    mostrar: entrada.mostrar ?? campoQueNombra(entrada.campos)!,
    icono: entrada.icono ?? 'List',
    campos: Object.entries(conActivo(entrada)).map(campoDefinido),
    permisos: { ver: `${modulo.clave}.${plural.clave}.ver`, gestionar: `${modulo.clave}.${plural.clave}.gestionar` },
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
