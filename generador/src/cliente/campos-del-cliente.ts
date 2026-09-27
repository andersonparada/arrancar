import type { CampoDefinido, DefinicionDeRecurso } from '../definicion/definir-recurso.js';
import { enServidor } from '../servidor/campos-en-servidor.js';
import { enCliente, type CampoEnCliente } from './campos-en-cliente.js';

/** Un campo de la definición junto con cómo se escribe en el cliente. */
export interface CampoDelCliente extends CampoDefinido {
  cliente: CampoEnCliente;
  nombreEnCodigo: string;
  requerido: boolean;
  /** El tipo que manda el servidor, sin `| null` (el mismo del DTO). */
  tipoPrimitivo: string;
  /** Un valor válido, como código: el mismo de las pruebas del servidor. */
  valorDePrueba: string;
  /** Nombre de la constante con las opciones de una lista: `OPCIONES_DE_SEXO`. */
  constanteDeOpciones: string;
}

export const camposDelCliente = (definicion: DefinicionDeRecurso): CampoDelCliente[] =>
  definicion.campos.map((campo) => {
    const servidor = enServidor(campo.campo);
    return {
      ...campo,
      cliente: enCliente(campo.campo),
      nombreEnCodigo: campo.nombre.camel,
      requerido: campo.campo.requerido,
      tipoPrimitivo: servidor.tipoPrimitivo,
      valorDePrueba: servidor.valoresDePrueba[0],
      constanteDeOpciones: `OPCIONES_DE_${campo.nombre.constante}`,
    };
  });

export const esLista = (campo: CampoDelCliente) => campo.cliente.forma === 'lista';

/** Las funciones que se llaman en un trozo de código: `numeroONulo(x)` → `numeroONulo`. */
export const funcionesUsadas = (codigos: string[]) =>
  [...new Set(codigos.flatMap((codigo) => [...codigo.matchAll(/(\w+)\(/g)].map(([, nombre]) => nombre!)))].sort();

export const importacion = (nombres: string[], desde: string) =>
  nombres.length ? `import { ${nombres.join(', ')} } from '${desde}';\n` : '';
