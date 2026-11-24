import { z } from 'zod';
import {
  decimalOpcional,
  enteroOpcional,
  fechaOpcional,
  idObligatorio,
  opcionObligatoria,
  opcionOpcional,
  textoObligatorio,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';
import { FORMAS_DE_TENENCIA } from '../dominio/datos-de-parcela.js';
import { FUENTES_DE_MEDICION } from '../dominio/medicion.js';
import { UNIDADES_DE_SUPERFICIE } from '../dominio/superficie.js';

/**
 * Forma de una fila del Excel de parcelas: lo mismo que el formulario, con la madre por su código, los inmuebles por
 * su nombre (separados con «;») y la medición inicial como cifra y unidad. Las reglas las revisa el caso de uso.
 */
export const esquemaParcelaEnExcel = z.object({
  localidadId: idObligatorio(),
  codigo: textoObligatorio(20),
  nombre: textoObligatorio(120),
  tipoId: idObligatorio(),
  formaDeTenencia: opcionObligatoria(FORMAS_DE_TENENCIA),
  parcelaMadreCodigo: textoOpcional(20),
  cantidadOriginal: decimalOpcional(4),
  unidadOriginal: opcionOpcional(UNIDADES_DE_SUPERFICIE),
  varasPorLadoDeCuerda: enteroOpcional(),
  cantidadUtil: decimalOpcional(4),
  fuente: opcionOpcional(FUENTES_DE_MEDICION),
  vigenteDesde: fechaOpcional(),
  latitud: decimalOpcional(6),
  longitud: decimalOpcional(6),
  colindanciaNorte: textoOpcional(300),
  colindanciaSur: textoOpcional(300),
  colindanciaOriente: textoOpcional(300),
  colindanciaPoniente: textoOpcional(300),
  inmuebles: textoOpcional(2000),
  observaciones: textoOpcional(500),
});
