/**
 * Conversiones entre lo que manda el servidor y lo que muestra un formulario.
 * Los campos de texto y de número del formulario trabajan con texto (el de número
 * puede devolver un número); el servidor espera `null` cuando algo no se llenó.
 */

type ValorDeCampo = string | number | null | undefined;

/** Lo guardado, para ponerlo en un campo: `null` queda vacío. */
export const textoDeEdicion = (valor: ValorDeCampo): string =>
  valor === null || valor === undefined ? '' : String(valor);

/** Lo escrito en un campo opcional: vacío o solo espacios se manda como `null`. */
export const textoONulo = (valor: ValorDeCampo): string | null => textoDeEdicion(valor).trim() || null;

/** Un número opcional: vacío se manda como `null`. */
export const numeroONulo = (valor: ValorDeCampo): number | null => {
  const texto = textoONulo(valor);
  return texto === null ? null : Number(texto);
};

/** Un número obligatorio: vacío no es un número, así que el servidor lo rechaza y avisa en el campo. */
export const numeroRequerido = (valor: ValorDeCampo): number => numeroONulo(valor) ?? Number.NaN;

/** Las opciones de una lista para un selector; si es opcional, con la opción de no elegir ninguna. */
export function opcionesDeLista<Valor extends string>(
  opciones: Record<Valor, string>,
  opcional: boolean,
): { valor: Valor | null; texto: string }[] {
  const deLaLista = (Object.entries(opciones) as [Valor, string][]).map(([valor, texto]) => ({ valor, texto }));
  return opcional ? [{ valor: null, texto: 'Sin elegir' }, ...deLaLista] : deLaLista;
}

/** Una opción de un selector que apunta a otro registro: su id y cómo se llama. */
export interface OpcionDeRegistro {
  valor: string | null;
  texto: string;
}

/**
 * Los registros que se pueden elegir en un selector, por su nombre. Siempre
 * empieza vacío: un registro nuevo todavía no ha elegido nada.
 */
export function opcionesDeRegistros<Registro extends { id: string }>(
  registros: Registro[],
  nombre: (registro: Registro) => string,
  requerido: boolean,
): OpcionDeRegistro[] {
  const vacia = { valor: null, texto: requerido ? 'Elija una opción' : 'Sin elegir' };
  return [vacia, ...registros.map((registro) => ({ valor: registro.id, texto: nombre(registro) }))];
}
