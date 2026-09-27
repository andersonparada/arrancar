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
