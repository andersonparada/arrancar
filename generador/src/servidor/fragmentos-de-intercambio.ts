import type { TipoDeCampo } from '../definicion/campos.js';
import type { DefinicionDeRecurso } from '../definicion/definir-recurso.js';
import {
  apuntaASiMisma,
  nombreDeLaReferencia,
  recursosReferidos,
  referenciasDe,
  type CampoDeReferencia,
} from '../referencias.js';
import type { CampoDelServidor } from './campos-del-recurso.js';

/** El tipo de columna del Excel para cada tipo de campo. */
const TIPO_DE_COLUMNA: Record<TipoDeCampo, string> = {
  texto: 'texto',
  textoLargo: 'texto',
  correo: 'texto',
  telefono: 'texto',
  nit: 'texto',
  dpi: 'texto',
  entero: 'entero',
  decimal: 'decimal',
  dinero: 'decimal',
  fecha: 'fecha',
  siNo: 'siNo',
  lista: 'lista',
  referencia: 'referencia',
};

const comillas = (texto: string) => `'${texto.replaceAll("'", "\\'")}'`;

/** Lo que cada tipo agrega a su columna: las opciones de una lista, o de dónde salen las de una referencia. */
function extraDeLaColumna(definido: CampoDelServidor): string {
  const { campo, nombreEnCodigo } = definido;
  if (campo.tipo === 'lista') {
    const opciones = Object.entries(campo.opciones).map(([valor, texto]) => `${valor}: ${comillas(texto)}`);
    return `, opciones: { ${opciones.join(', ')} }`;
  }
  if (campo.tipo === 'referencia') {
    return `, campoDeNombre: '${nombreDeLaReferencia(definido)}', opciones: opciones.${nombreEnCodigo}`;
  }
  return '';
}

const columna = (campo: CampoDelServidor) =>
  `  { clave: '${campo.nombreEnCodigo}', titulo: ${comillas(campo.etiqueta)}, requerido: ${campo.requerido}, tipo: '${TIPO_DE_COLUMNA[campo.campo.tipo]}'${extraDeLaColumna(campo)} },`;

/** De dónde salen las opciones de cada referencia: las consultas del recurso referido (o las propias). */
const opcionesDeLaReferencia = (campo: CampoDeReferencia, definicion: DefinicionDeRecurso) => {
  const consultas = apuntaASiMisma(campo, definicion)
    ? 'dependencias.consultas'
    : `new Consultas${campo.referida.plural.pascal}Drizzle()`;
  return `${campo.nombreEnCodigo}: opcionesDe(${consultas}, '${campo.referida.mostrar}')`;
};

const importarConsultas = ({ plural }: DefinicionDeRecurso) =>
  `import { Consultas${plural.pascal}Drizzle } from '../infraestructura/persistencia/consultas-${plural.clave}.drizzle.js';\n`;

/** Huecos de las columnas del Excel y de cómo se arma el intercambio en la composición. */
export function fragmentosDeIntercambio(campos: CampoDelServidor[], definicion: DefinicionDeRecurso) {
  const referencias = referenciasDe(definicion);
  const hay = referencias.length > 0;
  const nombres = referencias.map((campo) => `'${campo.nombreEnCodigo}'`).join(' | ');
  return {
    columnasDeIntercambio: campos.map(columna).join('\n'),
    dependenciasEnIntercambio: referencias.some((campo) => apuntaASiMisma(campo, definicion))
      ? 'dependencias'
      : '_dependencias',
    importacionDeOpcionDeReferencia: hay ? ', OpcionDeReferencia' : '',
    parametroDeOpciones: hay ? `opciones: Record<${nombres}, () => Promise<OpcionDeReferencia[]>>` : '',
    argumentoDeOpciones: hay
      ? `{ ${referencias.map((campo) => opcionesDeLaReferencia(campo, definicion)).join(', ')} }`
      : '',
    importacionesDeOpciones: hay
      ? "import { opcionesDe } from '../../core/intercambio/aplicacion/columnas.js';\n" +
        recursosReferidos(definicion).map(importarConsultas).join('')
      : '',
  };
}
