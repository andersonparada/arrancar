import type { z } from 'zod';
import {
  decimalOpcional,
  fechaOpcional,
  opcionOpcional,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';
import { CATEGORIAS_DE_IUSI, ORIGENES_DE_VALOR } from '../dominio/tipos-de-valor-de-inmueble.js';
import { esquemaInmueble } from './inmuebles.esquemas-http.js';

const esquemaDeLaSerie = {
  VigenteDesde: fechaOpcional(),
  Origen: opcionOpcional(ORIGENES_DE_VALOR),
  Terreno: decimalOpcional(2),
  Construcciones: decimalOpcional(2),
  Cultivos: decimalOpcional(2),
  Total: decimalOpcional(2),
  Documento: textoOpcional(150),
};

const falta = (dato: unknown) => dato === null || dato === undefined;
const OBLIGATORIAS = ['VigenteDesde', 'Origen', 'Total'] as const;

/** Si una serie trae algún dato, debe traer fecha, origen y total; el problema se informa en la columna que falta. */
function exigirLaSerie(
  serie: { prefijo: string; titulo: string },
  fila: Record<string, unknown>,
  contexto: z.RefinementCtx,
) {
  const { prefijo, titulo } = serie;
  const partes = [...Object.keys(esquemaDeLaSerie), 'CategoriaIusi'];
  if (partes.every((parte) => falta(fila[`${prefijo}${parte}`]))) return;
  for (const parte of OBLIGATORIAS.filter((obligatoria) => falta(fila[`${prefijo}${obligatoria}`]))) {
    contexto.addIssue({
      code: 'custom',
      path: [`${prefijo}${parte}`],
      message: `Falta este dato del valor de ${titulo}.`,
    });
  }
}

/** Una fila del Excel de inmuebles: los datos del formulario más los valores vigentes de cada fuente. */
export const esquemaInmuebleConValores = esquemaInmueble
  .extend({
    matriculaVigenteDesde: esquemaDeLaSerie.VigenteDesde,
    matriculaOrigen: esquemaDeLaSerie.Origen,
    matriculaTerreno: esquemaDeLaSerie.Terreno,
    matriculaConstrucciones: esquemaDeLaSerie.Construcciones,
    matriculaCultivos: esquemaDeLaSerie.Cultivos,
    matriculaTotal: esquemaDeLaSerie.Total,
    matriculaDocumento: esquemaDeLaSerie.Documento,
    matriculaCategoriaIusi: opcionOpcional(CATEGORIAS_DE_IUSI),
    catastroVigenteDesde: esquemaDeLaSerie.VigenteDesde,
    catastroOrigen: esquemaDeLaSerie.Origen,
    catastroTerreno: esquemaDeLaSerie.Terreno,
    catastroConstrucciones: esquemaDeLaSerie.Construcciones,
    catastroCultivos: esquemaDeLaSerie.Cultivos,
    catastroTotal: esquemaDeLaSerie.Total,
    catastroDocumento: esquemaDeLaSerie.Documento,
  })
  .superRefine((fila, contexto) => {
    exigirLaSerie({ prefijo: 'matricula', titulo: 'matrícula fiscal' }, fila, contexto);
    exigirLaSerie({ prefijo: 'catastro', titulo: 'catastro municipal' }, fila, contexto);
  });
