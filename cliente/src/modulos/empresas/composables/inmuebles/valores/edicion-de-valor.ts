import { textoDeEdicion, textoONulo } from '@/modulos/core/utilidades/edicion';
import type {
  CategoriaDeIusi,
  DatosValorDeInmueble,
  FuenteDeValor,
  OrigenDeValor,
  ValorDeInmueble,
} from '../../../servicios/valores-de-inmueble.api';

/** Lo que muestra cada campo de la ventana mientras se registra un valor. */
export interface EdicionDeValor {
  abierta: boolean;
  fuente: FuenteDeValor;
  vigenteDesde: string;
  origen: OrigenDeValor;
  valorTerreno: string;
  valorConstrucciones: string;
  valorCultivosPermanentes: string;
  valorTotal: string;
  categoriaIusi: CategoriaDeIusi | null;
  documento: string;
}

export const OPCIONES_DE_FUENTE: Record<FuenteDeValor, string> = {
  matricula_fiscal: 'Matrícula fiscal',
  catastro_municipal: 'Catastro municipal',
};

export const OPCIONES_DE_ORIGEN: Record<OrigenDeValor, string> = {
  avaluo_dicabi: 'Avalúo de DICABI',
  avaluo_municipal: 'Avalúo municipal',
  autoavaluo: 'Autoavalúo',
  valuador_autorizado: 'Valuador autorizado',
  otro: 'Otro',
};

export const OPCIONES_DE_CATEGORIA_DE_IUSI: Record<CategoriaDeIusi, string> = {
  vivienda: 'Vivienda',
  residencial: 'Residencial',
  mixto: 'Mixto',
  comercial: 'Comercial',
  otros: 'Otros',
};

/** Lo que dice la ayuda de la categoría; se revisa cuando se confirme la vigencia del Decreto 18-2026. */
export const AYUDA_DE_LA_CATEGORIA_DE_IUSI =
  'Vivienda, residencial y mixto: 0 por millar; comercial y otros: 3, 6 o 9 por millar. Una finca rústica caería en «otros».';

/** El origen más común de cada serie: el avalúo de DICABI para la matrícula y el municipal para el catastro. */
const ORIGEN_USUAL: Record<FuenteDeValor, OrigenDeValor> = {
  matricula_fiscal: 'avaluo_dicabi',
  catastro_municipal: 'avaluo_municipal',
};

/** Lo que se le pregunta al operador antes de eliminar un valor. */
export const mensajeDeEliminacionDeValor = (fuente: FuenteDeValor, fecha: string): string =>
  `Se eliminará el valor de ${OPCIONES_DE_FUENTE[fuente].toLowerCase()} vigente desde ${fecha}. Si Activos fijos ya lo usó en un mes cerrado no se podrá eliminar: registre otro valor con otra fecha. Esta acción no se puede deshacer.`;

/** La ventana abierta y vacía para registrar un valor de la serie `fuente`. */
export function edicionDeValor(fuente: FuenteDeValor): EdicionDeValor {
  return {
    abierta: true,
    fuente,
    vigenteDesde: '',
    origen: ORIGEN_USUAL[fuente],
    valorTerreno: '',
    valorConstrucciones: '',
    valorCultivosPermanentes: '',
    valorTotal: '',
    categoriaIusi: null,
    documento: '',
  };
}

/** Lo que se manda al servidor: lo vacío como `null`; los montos van como texto, nunca como número. */
export const datosDeValor = (edicion: EdicionDeValor): DatosValorDeInmueble => ({
  fuente: edicion.fuente,
  vigenteDesde: edicion.vigenteDesde,
  origen: edicion.origen,
  valorTerreno: textoONulo(edicion.valorTerreno),
  valorConstrucciones: textoONulo(edicion.valorConstrucciones),
  valorCultivosPermanentes: textoONulo(edicion.valorCultivosPermanentes),
  valorTotal: textoDeEdicion(edicion.valorTotal).trim(),
  categoriaIusi: edicion.fuente === 'matricula_fiscal' ? edicion.categoriaIusi : null,
  documento: textoONulo(edicion.documento),
});

/** El valor de la serie que rige hoy: el más reciente que ya empezó (la lista viene del más nuevo al más viejo). */
export function valorVigente(valores: ValorDeInmueble[], hoy: string): ValorDeInmueble | null {
  return valores.find((valor) => valor.vigenteDesde <= hoy) ?? null;
}

/** Los valores de una fuente, en el orden en que llegaron. */
export const valoresDeLaFuente = (valores: ValorDeInmueble[], fuente: FuenteDeValor): ValorDeInmueble[] =>
  valores.filter((valor) => valor.fuente === fuente);

/** La fecha de hoy del navegador, `AAAA-MM-DD`, sin pasar por UTC (no corre el día por la tarde). */
export function hoyEnIso(ahora: Date = new Date()): string {
  const dosDigitos = (numero: number) => String(numero).padStart(2, '0');
  return `${ahora.getFullYear()}-${dosDigitos(ahora.getMonth() + 1)}-${dosDigitos(ahora.getDate())}`;
}
