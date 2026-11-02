import type {
  DteRecibido,
  ProveedorNuevoDeLaFila,
  ProveedorNuevoPedido,
  ResultadoDeVistaPrevia,
  TipoDePersonaDelProveedor,
} from '../../servicios/dte-recibidos.api';

export const LARGO_DE_NOMBRES = 80;
export const LARGO_DE_APELLIDOS = 80;
export const LARGO_DE_RAZON_SOCIAL = 150;

/** Lo que el usuario ve y edita de un proveedor nuevo; cada tipo de persona guarda su propia edición. */
export interface EdicionDeProveedorNuevo {
  nit: string;
  nombreDelDte: string;
  filas: number;
  accion: 'crear' | 'agregar_papel';
  nombreExistente: string | null;
  tipo: TipoDePersonaDelProveedor;
  nombres: string;
  apellidos: string;
  razonSocial: string;
  /** Lo que el servidor usó, para el tercero que solo recibe el papel de proveedor. */
  usado: ProveedorNuevoDeLaFila['usado'];
  /** Persona individual cuyo nombre en el DTE no traía coma: puede ser el nombre de su negocio. */
  revisarContraElRtu: boolean;
}

export type EdicionPorNit = Record<string, EdicionDeProveedorNuevo>;
export type ProblemasDelProveedor = Partial<Record<'nombres' | 'apellidos' | 'razonSocial', string>>;

export interface GrupoDeProveedorNuevo {
  proveedor: ProveedorNuevoDeLaFila;
  filas: number;
  emision: string;
}

function sumarAlGrupo(
  actual: GrupoDeProveedorNuevo | undefined,
  proveedor: ProveedorNuevoDeLaFila,
  emision: string,
): GrupoDeProveedorNuevo {
  const masReciente = !actual || emision > actual.emision;
  return {
    proveedor: masReciente ? proveedor : actual.proveedor,
    emision: masReciente ? emision : actual.emision,
    filas: (actual?.filas ?? 0) + 1,
  };
}

/** Un grupo por NIT: cuántas filas lo usan y la propuesta de la fila de emisión más reciente. */
export function proveedoresNuevosDeLaVistaPrevia(
  resultados: readonly ResultadoDeVistaPrevia[],
  filas: readonly DteRecibido[],
): GrupoDeProveedorNuevo[] {
  const porId = new Map(filas.map((fila) => [fila.id, fila]));
  const porNit = new Map<string, GrupoDeProveedorNuevo>();
  for (const resultado of resultados) {
    if (!('proveedorNuevo' in resultado) || !resultado.proveedorNuevo) continue;
    const { proveedorNuevo } = resultado;
    const emision = porId.get(resultado.id)?.fechaEmision ?? '';
    porNit.set(proveedorNuevo.nit, sumarAlGrupo(porNit.get(proveedorNuevo.nit), proveedorNuevo, emision));
  }
  return [...porNit.values()].sort((a, b) =>
    a.proveedor.nombreDelDte.localeCompare(b.proveedor.nombreDelDte, 'es', { sensitivity: 'base' }),
  );
}

function edicionNueva({ proveedor, filas }: GrupoDeProveedorNuevo): EdicionDeProveedorNuevo {
  const { propuesta } = proveedor;
  return {
    nit: proveedor.nit,
    nombreDelDte: proveedor.nombreDelDte,
    filas,
    accion: proveedor.accion,
    nombreExistente: proveedor.nombreExistente,
    tipo: propuesta.tipoDePersona,
    nombres: propuesta.individual.nombres,
    apellidos: propuesta.individual.apellidos ?? '',
    razonSocial: propuesta.juridica.razonSocial,
    usado: proveedor.usado,
    revisarContraElRtu: propuesta.tipoDePersona === 'individual' && !proveedor.nombreDelDte.includes(','),
  };
}

/** La edición para los grupos de ahora: conserva lo que el usuario escribió, agrega los NIT nuevos y suelta los que ya no están. */
export function edicionInicial(grupos: readonly GrupoDeProveedorNuevo[], actual: EdicionPorNit): EdicionPorNit {
  const edicion: EdicionPorNit = {};
  for (const grupo of grupos) {
    const previa = actual[grupo.proveedor.nit];
    edicion[grupo.proveedor.nit] = previa ? { ...previa, filas: grupo.filas } : edicionNueva(grupo);
  }
  return edicion;
}

/** `obligatorio` es cómo se llama el campo si no puede quedar vacío (para decir «Escriba …»). */
function problemaDeTexto(valor: string, largo: number, obligatorio?: string): string | undefined {
  const texto = valor.trim();
  if (obligatorio && !texto) return `Escriba ${obligatorio}.`;
  if (texto.length > largo) return `Máximo ${largo} caracteres (tiene ${texto.length}). Acórtelo.`;
  return undefined;
}

/** Qué campo está mal y cómo corregirlo; vacío si todo está bien. Solo cuenta lo del tipo elegido. */
export function problemasDelProveedorNuevo(edicion: EdicionDeProveedorNuevo): ProblemasDelProveedor {
  if (edicion.accion !== 'crear') return {};
  const problemas: ProblemasDelProveedor = {};
  if (edicion.tipo === 'juridica') {
    const razon = problemaDeTexto(edicion.razonSocial, LARGO_DE_RAZON_SOCIAL, 'la razón social');
    if (razon) problemas.razonSocial = razon;
    return problemas;
  }
  const nombres = problemaDeTexto(edicion.nombres, LARGO_DE_NOMBRES, 'los nombres');
  const apellidos = problemaDeTexto(edicion.apellidos, LARGO_DE_APELLIDOS);
  if (nombres) problemas.nombres = nombres;
  if (apellidos) problemas.apellidos = apellidos;
  return problemas;
}

const tieneProblemas = (proveedor: EdicionDeProveedorNuevo): boolean =>
  Object.keys(problemasDelProveedorNuevo(proveedor)).length > 0;

/** Algún proveedor nuevo tiene un campo por corregir. */
export const hayProblemas = (edicion: EdicionPorNit): boolean => Object.values(edicion).some(tieneProblemas);

function pedidoDe(edicion: EdicionDeProveedorNuevo): ProveedorNuevoPedido {
  if (edicion.accion === 'agregar_papel') {
    const { usado } = edicion;
    if (usado.tipoDePersona === 'juridica') return usado;
    return {
      tipoDePersona: 'individual',
      nombres: usado.nombres,
      ...(usado.apellidos ? { apellidos: usado.apellidos } : {}),
    };
  }
  if (edicion.tipo === 'juridica') return { tipoDePersona: 'juridica', razonSocial: edicion.razonSocial.trim() };
  const apellidos = edicion.apellidos.trim();
  return { tipoDePersona: 'individual', nombres: edicion.nombres.trim(), ...(apellidos ? { apellidos } : {}) };
}

/** Lo que se manda al servidor, por NIT; los que tienen algún campo mal se dejan fuera (el servidor los rechazaría). */
export function proveedoresNuevosParaEnviar(edicion: EdicionPorNit): Record<string, ProveedorNuevoPedido> {
  const pedidos: Record<string, ProveedorNuevoPedido> = {};
  for (const proveedor of Object.values(edicion)) {
    if (!tieneProblemas(proveedor)) pedidos[proveedor.nit] = pedidoDe(proveedor);
  }
  return pedidos;
}
