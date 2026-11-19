import { FuenteNoDisponible, RespuestaInvalida } from '../../dominio/errores.js';

const DEMASIADO_GRANDE = 'La respuesta del Banguat es demasiado grande.';

/** Junta las partes del cuerpo y corta en cuanto pasan de `maximoBytes`. */
async function juntarPartes(cuerpo: ReadableStream<Uint8Array>, maximoBytes: number): Promise<Buffer> {
  const partes: Uint8Array[] = [];
  let total = 0;
  for await (const parte of cuerpo as unknown as AsyncIterable<Uint8Array>) {
    total += parte.byteLength;
    if (total > maximoBytes) throw new RespuestaInvalida(DEMASIADO_GRANDE);
    partes.push(parte);
  }
  return Buffer.concat(partes);
}

/**
 * Lee el cuerpo de una respuesta sin pasar de `maximoBytes`: si el servidor anuncia más, o manda más, corta la lectura.
 * @throws RespuestaInvalida si el cuerpo es más grande que el tope.
 * @throws FuenteNoDisponible si la conexión se cae a media lectura.
 */
export async function leerTextoAcotado(respuesta: Response, maximoBytes: number): Promise<string> {
  if (Number(respuesta.headers.get('content-length') ?? 0) > maximoBytes) {
    await respuesta.body?.cancel();
    throw new RespuestaInvalida(DEMASIADO_GRANDE);
  }
  if (!respuesta.body) return '';
  try {
    return (await juntarPartes(respuesta.body, maximoBytes)).toString('utf8');
  } catch (error) {
    if (error instanceof RespuestaInvalida) throw error;
    throw new FuenteNoDisponible('Se interrumpió la lectura de la respuesta del Banguat.');
  }
}
