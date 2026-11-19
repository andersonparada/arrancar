import { armarCuerpos } from './diseno-de-correo.js';
import { AdjuntoNoValido, ContenidoDeCorreoNoValido } from './errores-de-la-bandeja.js';
import { PlantillaDeCorreo } from './plantilla-de-correo.js';
import { sanearNombreDeAdjunto, sanearTexto } from './saneado.js';

export const MAXIMO_DEL_ASUNTO = 150;
export const MAXIMO_DEL_ADJUNTO_EN_BYTES = 5 * 1024 * 1024;
const MAXIMO_DEL_TEXTO = 20_000;
const MAXIMO_DEL_HTML = 100_000;
const FIRMA_DE_PDF = '%PDF-';

/** Plantillas con marcadores `{nombre}`: el módulo declara la lista cerrada de marcadores de cada una y sus valores. */
export interface PlantillaPorEncolar {
  readonly asunto: string;
  readonly mensaje: string;
  readonly marcadoresDelAsunto: readonly string[];
  readonly marcadoresDelMensaje: readonly string[];
  readonly valores: Readonly<Record<string, string>>;
}

export interface DatosDelContenido {
  readonly empresa: string;
  readonly aplicacion: string;
  /** Si el correo lleva «Responder a» la empresa. */
  readonly conRespuesta: boolean;
}

export interface ContenidoDeCorreo {
  readonly asunto: string;
  readonly texto: string;
  readonly html: string;
  /** «<Empresa> por medio de <aplicación>»: lo que ve quien recibe como remitente (C7). */
  readonly nombreVisible: string;
}

/**
 * Arma el asunto, los cuerpos (texto y HTML escapado) y el nombre visible. Un marcador desconocido es un error de
 * configuración y nunca se deja literal.
 * @throws MarcadorDesconocido, ContenidoDeCorreoNoValido
 */
export function armarContenido(plantilla: PlantillaPorEncolar, datos: DatosDelContenido): ContenidoDeCorreo {
  const { valores } = plantilla;
  const asunto = sanearTexto(
    PlantillaDeCorreo.crear(plantilla.asunto, plantilla.marcadoresDelAsunto).aplicar(valores),
    MAXIMO_DEL_ASUNTO,
  );
  const mensaje = PlantillaDeCorreo.crear(plantilla.mensaje, plantilla.marcadoresDelMensaje).aplicar(valores);
  const empresa = sanearTexto(datos.empresa, MAXIMO_DEL_ASUNTO);
  if (empresa === '') throw new ContenidoDeCorreoNoValido('falta el nombre de la empresa.');
  const cuerpos = armarCuerpos({ mensaje, empresa, aplicacion: datos.aplicacion, conRespuesta: datos.conRespuesta });
  const nombreVisible = sanearTexto(`${empresa} por medio de ${datos.aplicacion}`, MAXIMO_DEL_ASUNTO);
  const contenido = { asunto, nombreVisible, ...cuerpos };
  exigirContenido(contenido, mensaje);
  return contenido;
}

function exigirContenido({ asunto, texto, nombreVisible, html }: ContenidoDeCorreo, mensaje: string): void {
  if (asunto === '' || nombreVisible === '' || mensaje.trim() === '') {
    throw new ContenidoDeCorreoNoValido('el asunto y el mensaje no pueden quedar vacíos.');
  }
  if (texto.length > MAXIMO_DEL_TEXTO || html.length > MAXIMO_DEL_HTML) {
    throw new ContenidoDeCorreoNoValido('el mensaje es demasiado largo.');
  }
}

export interface AdjuntoValidado {
  readonly nombre: string;
  readonly contenido: Buffer;
}

/**
 * Solo un PDF generado por la aplicación, de hasta 5 MB (C8): el nombre se sanea y se fuerza `.pdf`.
 * @throws AdjuntoNoValido
 */
export function validarAdjunto(nombre: string, contenido: Buffer): AdjuntoValidado {
  if (contenido.length === 0 || contenido.length > MAXIMO_DEL_ADJUNTO_EN_BYTES) {
    throw new AdjuntoNoValido('debe pesar entre 1 byte y 5 MB.');
  }
  if (contenido.subarray(0, FIRMA_DE_PDF.length).toString('latin1') !== FIRMA_DE_PDF) {
    throw new AdjuntoNoValido('solo se aceptan PDF.');
  }
  return { nombre: sanearNombreDeAdjunto(nombre), contenido };
}
