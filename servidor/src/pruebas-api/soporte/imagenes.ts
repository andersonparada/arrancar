import sharp from 'sharp';

export interface Imagen {
  nombreArchivo: string;
  tipoMime: string;
  contenido: Buffer;
}

const SEPARADOR = '----arrancar-pruebas';

/** Imagen PNG real y diminuta, suficiente para que el servidor la procese. */
export async function crearImagenPng(ancho = 64, alto = 48): Promise<Imagen> {
  const contenido = await sharp({
    create: { width: ancho, height: alto, channels: 3, background: '#1f4d2c' },
  })
    .png()
    .toBuffer();
  return { nombreArchivo: 'prueba.png', tipoMime: 'image/png', contenido };
}

export function crearArchivoDeTexto(): Imagen {
  return { nombreArchivo: 'notas.txt', tipoMime: 'text/plain', contenido: Buffer.from('esto no es una imagen') };
}

/** Arma un cuerpo `multipart/form-data` con la imagen en el campo `archivo`. */
export function imagenMultipart(imagen: Imagen): { cuerpo: Buffer; tipoContenido: string } {
  const encabezado =
    `--${SEPARADOR}\r\n` +
    `Content-Disposition: form-data; name="archivo"; filename="${imagen.nombreArchivo}"\r\n` +
    `Content-Type: ${imagen.tipoMime}\r\n\r\n`;
  const cierre = `\r\n--${SEPARADOR}--\r\n`;
  return {
    cuerpo: Buffer.concat([Buffer.from(encabezado), imagen.contenido, Buffer.from(cierre)]),
    tipoContenido: `multipart/form-data; boundary=${SEPARADOR}`,
  };
}
