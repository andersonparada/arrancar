import type { CampoDefinido, DefinicionDeRecurso } from '../definicion/definir-recurso.js';
import { enServidor, type CampoEnServidor } from './campos-en-servidor.js';

/** Un campo de la definición junto con cómo se escribe en el servidor. */
export interface CampoDelServidor extends CampoDefinido {
  servidor: CampoEnServidor;
  nombreEnCodigo: string;
  requerido: boolean;
}

export const camposDelServidor = (definicion: DefinicionDeRecurso): CampoDelServidor[] =>
  definicion.campos.map((campo) => ({
    ...campo,
    servidor: enServidor(campo.campo),
    nombreEnCodigo: campo.nombre.camel,
    requerido: campo.campo.requerido,
  }));

/** Cuántas carpetas hay que subir para llegar a `modulos/`: `../../core/...` desde `dominio/`. */
export const rutaAlCore = (niveles: number) => `${'../'.repeat(niveles)}core`;

export const conNulo = (tipo: string, requerido: boolean) => (requerido ? tipo : `${tipo} | null`);

export const conObjetoDeValor = (campos: CampoDelServidor[]) => campos.filter((campo) => campo.servidor.objetoDeValor);

/** Una línea por campo, con la sangría de un bloque de tipo u objeto. */
export const lineas = (textos: string[], sangria = '  ') => textos.map((texto) => `${sangria}${texto}`).join('\n');

/** Las importaciones van en líneas completas; si no hay ninguna, no queda línea vacía. */
export const comoImportaciones = (importaciones: string[]) =>
  [...new Set(importaciones)].map((importacion) => `${importacion}\n`).join('');
