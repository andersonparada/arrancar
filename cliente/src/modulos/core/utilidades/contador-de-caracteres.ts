/** Cuánto lleva escrito un campo con tope y qué decirle: el tope no corta en silencio, se avisa. */
export interface EstadoDelContador {
  usados: number;
  maximo: number;
  excedido: boolean;
  /** «32 de 100 caracteres», para mostrarlo siempre junto al campo. */
  texto: string;
  /** Solo si se pasó: cuántos sobran y qué hacer. */
  error: string | null;
}

/** El contador de un campo de texto; cuenta lo que verá el servidor (sin espacios al borde). */
export function contadorDeCaracteres(texto: string | number | null | undefined, maximo: number): EstadoDelContador {
  const usados = String(texto ?? '').trim().length;
  const sobran = usados - maximo;
  return {
    usados,
    maximo,
    excedido: sobran > 0,
    texto: `${usados} de ${maximo} caracteres`,
    error:
      sobran > 0
        ? `${sobran === 1 ? 'Sobra 1 carácter' : `Sobran ${sobran} caracteres`}. Acórtelo a ${maximo} o menos.`
        : null,
  };
}
