import type { DefinicionDeRecurso } from '../definicion/definir-recurso.js';
import {
  apuntaASiMisma,
  nombreDeLaReferencia,
  recursosReferidos,
  referenciasDe,
  type CampoDeReferencia,
} from '../referencias.js';
import { valoresDelRecurso } from '../valores-del-recurso.js';

const importarApi = ({ plural, entidad }: DefinicionDeRecurso) =>
  `import { api${plural.pascal}, type ${entidad.pascal} } from '../../servicios/${plural.clave}.api';\n`;

/** Trae los registros de un recurso referido para su selector. */
function carga(referida: DefinicionDeRecurso): string {
  const { plural, entidad } = referida;
  const { losPlural } = valoresDelRecurso(referida, '');
  return `  const { datos: ${plural.camel} } = usarCarga(
    () => api${plural.pascal}.listar(),
    [] as ${entidad.pascal}[],
    'No se pudieron cargar ${losPlural}.',
  );`;
}

/** Las opciones de un selector: los registros referidos (o los mismos, si apunta a sí misma) por su nombre. */
function opciones(campo: CampoDeReferencia, definicion: DefinicionDeRecurso): string {
  const { referida, nombreEnCodigo, campo: tipo } = campo;
  const registros = apuntaASiMisma(campo, definicion) ? 'registros' : referida.plural.camel;
  const registro = referida.entidad.camel;
  return `    ${nombreEnCodigo}: opcionesDeRegistros(${registros}.value, (${registro}) => String(${registro}.${referida.mostrar}), ${tipo.requerido}),`;
}

/** Si apunta a sí misma, sus propios registros son las opciones: el composable los recibe. */
const apuntaASiMismo = (definicion: DefinicionDeRecurso) =>
  referenciasDe(definicion).some((campo) => apuntaASiMisma(campo, definicion));

function importacionesEnReferencias(definicion: DefinicionDeRecurso): string {
  const referidos = recursosReferidos(definicion);
  const { Entidad, pluralClave } = valoresDelRecurso(definicion, '');
  const propio = apuntaASiMismo(definicion);
  return [
    `import { computed${propio ? ', type Ref' : ''} } from 'vue';\n`,
    referidos.length ? "import { usarCarga } from '@/modulos/core/composables/usar-carga';\n" : '',
    "import { opcionesDeRegistros } from '@/modulos/core/utilidades/edicion';\n",
    ...referidos.map(importarApi),
    propio ? `import type { ${Entidad} } from '../../servicios/${pluralClave}.api';\n` : '',
  ].join('');
}

/** Huecos del composable de lo que se puede elegir. */
function fragmentosDelComposable(definicion: DefinicionDeRecurso) {
  const { Entidad } = valoresDelRecurso(definicion, '');
  return {
    importacionesEnReferencias: importacionesEnReferencias(definicion),
    parametroDeRegistros: apuntaASiMismo(definicion) ? `registros: Ref<${Entidad}[]>` : '',
    cargasEnReferencias: recursosReferidos(definicion).map(carga).join('\n'),
    opcionesDeReferencias: referenciasDe(definicion)
      .map((campo) => opciones(campo, definicion))
      .join('\n'),
  };
}

const SIN_REFERENCIAS = {
  importacionDeReferencias: '',
  cargaDeReferencias: '',
  referenciasEnRetorno: '',
  referenciasEnPagina: '',
  referenciasEnVentana: '',
  importacionDeOpcionesEnVentana: '',
  propDeReferencias: '',
  referenciasEnCampos: '',
  registrosParaReferencias: '',
};

/** Huecos del composable de la pantalla, la página y la ventana: pedir lo elegible y pasarlo al selector. */
export function fragmentosDeReferenciasEnCliente(definicion: DefinicionDeRecurso): Record<string, string> {
  const campos = referenciasDe(definicion);
  if (campos.length === 0) return SIN_REFERENCIAS;
  const { Entidad, entidadClave } = valoresDelRecurso(definicion, '');
  const nombres = campos.map((campo) => `'${campo.nombreEnCodigo}'`).join(' | ');
  return {
    ...fragmentosDelComposable(definicion),
    importacionDeReferencias: `import { usarReferenciasDe${Entidad} } from './referencias-de-${entidadClave}';\n`,
    cargaDeReferencias: `  const referencias = usarReferenciasDe${Entidad}(${apuntaASiMismo(definicion) ? 'registros' : ''});\n`,
    referenciasEnRetorno: 'referencias, ',
    referenciasEnPagina: 'referencias, ',
    referenciasEnVentana: '      :referencias="referencias"\n',
    importacionDeOpcionesEnVentana: "import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';\n",
    propDeReferencias: `; referencias: Record<${nombres}, OpcionDeRegistro[]>`,
    referenciasEnCampos: ' :referencias="referencias"',
    registrosParaReferencias: apuntaASiMismo(definicion) ? registrosPropios(definicion) : '',
  };
}

/**
 * En el formulario en página no hay lista: si apunta a sí misma, la trae para
 * el selector, sin el registro que se edita (no puede elegirse a sí mismo).
 */
function registrosPropios(definicion: DefinicionDeRecurso): string {
  const { Plural, Entidad, losPlural, entidad } = valoresDelRecurso(definicion, '');
  return `  const { datos: registros } = usarCarga(
    async () => (await api${Plural}.listar()).filter((registro) => registro.id !== ${entidad}Id),
    [] as ${Entidad}[],
    'No se pudieron cargar ${losPlural}.',
  );
`;
}

/** En la prueba de la edición, el registro trae el nombre de lo elegido, que no se manda de vuelta. */
export const nombresEnRegistroDePrueba = (definicion: DefinicionDeRecurso) =>
  referenciasDe(definicion)
    .map((campo) => `, ${nombreDeLaReferencia(campo)}: null`)
    .join('');
