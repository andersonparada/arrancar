import type { ConceptoDeGasto } from '../../servicios/conceptos-de-gasto.api';
import type { ClaseDeCargo } from '../../servicios/registro-de-documentos.api';
import type { EdicionDeDocumento } from './edicion-de-documento';
import { aplicarConcepto } from './lineas-del-documento';

/** Las clases de cargo que se ofrecen, con una ayuda corta; el servidor las avisa pero no las exige. */
export const CLASES_DE_CARGO: { valor: ClaseDeCargo; texto: string; ayuda: string }[] = [
  { valor: 'precio', texto: 'Diferencia de precio', ayuda: 'El proveedor cobró de menos y ahora cobra la diferencia.' },
  {
    valor: 'intereses',
    texto: 'Intereses',
    ayuda: 'Cargo por pagar tarde. Es un gasto financiero y su contador decide si lleva retención.',
  },
  { valor: 'otros', texto: 'Otros cargos', ayuda: 'Fletes, mora u otro cargo que no es el precio ni los intereses.' },
];

const sinAcentos = (texto: string): string => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

const nombreContiene = (conceptos: ConceptoDeGasto[], palabra: string): ConceptoDeGasto | undefined =>
  [...conceptos]
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    .find(({ nombre }) => sinAcentos(nombre).includes(palabra));

/** El concepto de gasto financiero que se propone para los intereses; `undefined` si la empresa no tiene uno activo. */
export function conceptoDeIntereses(conceptos: ConceptoDeGasto[]): ConceptoDeGasto | undefined {
  const activos = conceptos.filter(({ activo }) => activo);
  return nombreContiene(activos, 'financier') ?? nombreContiene(activos, 'interes');
}

/**
 * Con «Intereses» la primera línea sin concepto se propone con el gasto financiero. No pisa un concepto que el
 * usuario ya eligió. Devuelve si hizo la propuesta.
 */
export function proponerConceptoDeIntereses(edicion: EdicionDeDocumento, conceptos: ConceptoDeGasto[]): boolean {
  const concepto = conceptoDeIntereses(conceptos);
  const linea = edicion.lineas.find(({ conceptoId }) => !conceptoId);
  if (!concepto || !linea) return false;
  linea.conceptoId = concepto.id;
  aplicarConcepto(linea, concepto);
  return true;
}
