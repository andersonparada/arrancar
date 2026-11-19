import type { DatosDeInmueble } from './datos-de-inmueble.js';
import { InmuebleInvalido, InmuebleRegistroIncompleto } from './errores-de-inmueble.js';

const DATO_DEL_REGISTRO = /^[A-Za-z0-9 ./-]{1,20}$/;
const NUMERO_POSITIVO = /^\d+(\.\d+)?$/;

/** Recorta un texto; vacío es «sin dato». */
export function textoOpcional(texto: string | null, campo: string, largoMaximo: number): string | null {
  const limpio = texto?.trim();
  if (!limpio) return null;
  if (limpio.length > largoMaximo) throw new InmuebleInvalido(`"${campo}" admite hasta ${largoMaximo} caracteres.`);
  return limpio;
}

/** Un número decimal escrito como texto, mayor que cero. */
export function exigirPositivo(valor: string | null, campo: string): void {
  if (valor === null) return;
  if (!NUMERO_POSITIVO.test(valor) || !/[1-9]/.test(valor)) {
    throw new InmuebleInvalido(`"${campo}" debe ser mayor que cero.`);
  }
}

const datosDelLibro = (datos: DatosDeInmueble) => [
  datos.registro,
  datos.numeroDeFinca,
  datos.folio,
  datos.libro,
  datos.departamentoRegistral,
];

function validarUnInscrito(datos: DatosDeInmueble): void {
  if (datosDelLibro(datos).some((dato) => dato === null)) {
    throw new InmuebleRegistroIncompleto(
      'Un inmueble inscrito necesita el registro, el número de finca, el folio, el libro y el departamento del libro.',
    );
  }
  const formaValida = [datos.numeroDeFinca, datos.folio, datos.libro].every((dato) =>
    DATO_DEL_REGISTRO.test(dato ?? ''),
  );
  if (!formaValida) {
    throw new InmuebleInvalido(
      'La finca, el folio y el libro admiten hasta 20 letras, números, espacios, punto, diagonal o guion.',
    );
  }
}

function validarUnPosesorio(datos: DatosDeInmueble): void {
  if (datosDelLibro(datos).some((dato) => dato !== null)) {
    throw new InmuebleRegistroIncompleto('Un inmueble posesorio no lleva los datos del libro del registro.');
  }
  if (datos.documentoPosesorio === null) {
    throw new InmuebleRegistroIncompleto('Escriba el documento de los derechos posesorios.');
  }
}

/** Inscrito lleva los cinco datos de su libro; posesorio, su documento y ninguno de los del libro. */
export function validarElRegistro(datos: DatosDeInmueble): void {
  if (datos.situacionRegistral === 'inscrito') validarUnInscrito(datos);
  else validarUnPosesorio(datos);
  if (datos.situacionRegistral === 'inscrito' && (datos.documentoPosesorio || datos.titulacionSupletoriaEnTramite)) {
    throw new InmuebleInvalido('El documento posesorio y la titulación supletoria son de un inmueble posesorio.');
  }
}

/** La copropiedad lleva su porcentaje (mayor que 0 y menor que 100); las demás titularidades, no. */
export function validarLaTitularidad(datos: DatosDeInmueble): void {
  const { titularidad, porcentajeDeCopropiedad: porcentaje } = datos;
  if ((titularidad === 'copropiedad') !== (porcentaje !== null)) {
    throw new InmuebleInvalido('El porcentaje de copropiedad se escribe solo si el inmueble es de copropiedad.');
  }
  exigirPositivo(porcentaje, 'Porcentaje de copropiedad');
  if (porcentaje !== null && Number(porcentaje.split('.')[0]) >= 100) {
    throw new InmuebleInvalido('El porcentaje de copropiedad debe ser menor que 100.');
  }
}

/** La cifra de la escritura: cantidad y unidad juntas; la cuerda dice cuántas varas mide por lado. */
export function validarLaCifraOriginal(datos: DatosDeInmueble): void {
  const { cantidadOriginal, unidadOriginal, varasPorLadoDeCuerda: varas } = datos;
  if ((cantidadOriginal === null) !== (unidadOriginal === null)) {
    throw new InmuebleInvalido('Escriba la cantidad y la unidad de la escritura, o ninguna de las dos.');
  }
  exigirPositivo(cantidadOriginal, 'Cantidad de la escritura');
  exigirPositivo(datos.superficieRegistralM2, 'Superficie registral');
  if ((unidadOriginal === 'cuerda') !== (varas !== null)) {
    throw new InmuebleInvalido('Las varas por lado se escriben solo cuando la unidad es la cuerda.');
  }
  if (varas !== null && (varas < 1 || varas > 100)) {
    throw new InmuebleInvalido('Las varas por lado de la cuerda van de 1 a 100.');
  }
}

/** El departamento y el municipio van juntos o ninguno. */
export function validarLaUbicacion(datos: DatosDeInmueble): void {
  if ((datos.departamentoCodigo === null) !== (datos.municipioCodigo === null)) {
    throw new InmuebleInvalido('Elija el departamento y el municipio, o ninguno de los dos.');
  }
}
