import type { CampoDefinido, DefinicionDeRecurso } from './definicion/definir-recurso.js';
import { enServidor } from './servidor/campos-en-servidor.js';

/** Un campo que apunta a otro recurso, con ese recurso ya cargado. */
export type CampoDeReferencia = CampoDefinido & { referida: DefinicionDeRecurso };

export const esReferencia = (campo: CampoDefinido): campo is CampoDeReferencia =>
  campo.campo.tipo === 'referencia' && campo.referida !== undefined;

export const referenciasDe = (definicion: DefinicionDeRecurso): CampoDeReferencia[] =>
  definicion.campos.filter(esReferencia);

/** Lo que trae la consulta para mostrar el registro elegido: `potreroId` → `potreroNombre`. */
export const nombreDeLaReferencia = (campo: CampoDefinido) => `${campo.nombre.camel}Nombre`;

export const apuntaASiMisma = (campo: CampoDeReferencia, definicion: DefinicionDeRecurso) =>
  campo.referida.entidad.pascal === definicion.entidad.pascal;

/** El tipo del nombre que se muestra: el del campo que nombra al recurso referido, o `null` si no hay. */
export function tipoDelNombre({ referida }: CampoDeReferencia): string {
  const mostrar = referida.campos.find((campo) => campo.nombreEnCodigo === referida.mostrar)!;
  return `${enServidor(mostrar.campo, mostrar.referida).tipoPrimitivo} | null`;
}

/** Los recursos a los que apunta, cada uno una vez y sin contarse a sí mismo. */
export function recursosReferidos(definicion: DefinicionDeRecurso): DefinicionDeRecurso[] {
  const porEntidad = new Map<string, DefinicionDeRecurso>();
  for (const campo of referenciasDe(definicion)) {
    if (!apuntaASiMisma(campo, definicion)) porEntidad.set(campo.referida.entidad.pascal, campo.referida);
  }
  return [...porEntidad.values()];
}

/** Los nombres de lo que solo se lee, para quitarlos de lo que se manda: ` | 'potreroNombre'`. */
export const omitirReferencias = (definicion: DefinicionDeRecurso) =>
  referenciasDe(definicion)
    .map((campo) => ` | '${nombreDeLaReferencia(campo)}'`)
    .join('');

/** Una línea por referencia con el nombre del registro elegido, para el tipo de lo que manda el servidor. */
export const nombresDeReferencias = (definicion: DefinicionDeRecurso, sangria = '  ') =>
  referenciasDe(definicion)
    .map((campo) => `\n${sangria}${nombreDeLaReferencia(campo)}: ${tipoDelNombre(campo)};`)
    .join('');
