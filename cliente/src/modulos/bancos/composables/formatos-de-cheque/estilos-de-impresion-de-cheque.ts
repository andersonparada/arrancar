import type { CampoArmado, ChequeArmado, FormatoDeCheque } from '../../servicios/tipos-de-formatos-de-cheque';
import { entradasDelFormato, leerCampo } from './campos-del-formato';

/**
 * Los estilos de la hoja impresa del cheque: todo en milímetros y puntos, para que salga a la medida del formulario.
 * Lógica pura, sin Vue.
 */

/** Píxeles de CSS por milímetro (96 por pulgada): solo para dibujar en pantalla a escala. */
export const PIXELES_POR_MM = 96 / 25.4;
const MM_POR_PUNTO = 25.4 / 72;
/** El mismo ancho de carácter que usa el servidor para el relleno (Courier: 0.6 em). */
export const FAMILIA_MONOESPACIADA = '"Courier New", Courier, "Liberation Mono", "DejaVu Sans Mono", monospace';

const mm = (valor: number): string => `${redondear(valor)}mm`;
const redondear = (valor: number): number => Math.round(valor * 100) / 100;

/** La regla de página que hace que el navegador imprima el cheque en su papel, sin márgenes. */
export const reglaDePagina = (papel: ChequeArmado['papel'], nombre?: string): string =>
  `@page${nombre ? ` ${nombre}` : ''} { size: ${redondear(papel.anchoMm)}mm ${redondear(papel.altoMm)}mm; margin: 0; }`;

/** Lo que se le quita al alto al imprimir para que el navegador no agregue una página en blanco por redondeo. */
const HOLGURA_DE_IMPRESION_MM = 0.2;

/** El tamaño real de la hoja; `--alto-impresion` es el alto con la holgura, que se usa solo al imprimir. */
export const estiloDeLaHoja = (papel: ChequeArmado['papel']): Record<string, string> => ({
  width: mm(papel.anchoMm),
  height: mm(papel.altoMm),
  '--alto-impresion': mm(papel.altoMm - HOLGURA_DE_IMPRESION_MM),
});

/** El alto de un renglón con esa letra, en milímetros. */
export const altoDeRenglonMm = (tamanoPt: number): number => redondear(tamanoPt * MM_POR_PUNTO * 1.2);

/** Cada texto del cheque: su esquina y su ancho en milímetros (más el desplazamiento de la impresora) y su letra en puntos. */
export function estiloDelCampo(
  campo: CampoArmado,
  desplazamiento: ChequeArmado['desplazamiento'],
): Record<string, string> {
  return {
    left: mm(campo.xMm + desplazamiento.xMm),
    top: mm(campo.yMm + desplazamiento.yMm),
    width: mm(campo.anchoMm),
    fontSize: `${campo.tamanoPt}pt`,
    lineHeight: mm(altoDeRenglonMm(campo.tamanoPt)),
    textAlign: { izquierda: 'left', centro: 'center', derecha: 'right' }[campo.alineacion],
    fontFamily: FAMILIA_MONOESPACIADA,
  };
}

/** Cuánto hay que achicar una hoja de `anchoMm` para que quepa en `anchoDisponiblePx` (nunca se agranda de más). */
export function escalaParaAncho(anchoMm: number, anchoDisponiblePx: number, maximo = 2): number {
  if (anchoMm <= 0 || anchoDisponiblePx <= 0) return 1;
  return Math.min(maximo, anchoDisponiblePx / (anchoMm * PIXELES_POR_MM));
}

/** Una marca de la regla de la prueba: a cuántos milímetros del borde y cómo se rotula. */
export interface MarcaDeRegla {
  mm: number;
  etiqueta: string;
}

/** Las marcas de la regla cada `separacionMm` (1 a 100), de 0 hasta el borde. */
export function marcasDeRegla(largoMm: number, separacionMm: number): MarcaDeRegla[] {
  const paso = Math.min(100, Math.max(1, Math.floor(separacionMm) || 10));
  const marcas: MarcaDeRegla[] = [];
  for (let punto = 0; punto <= largoMm; punto += paso) marcas.push({ mm: punto, etiqueta: String(punto) });
  return marcas;
}

/** Un rectángulo del esquema del editor: lo que ocuparía cada campo en el papel. */
export interface CajaDelEsquema {
  clave: string;
  etiqueta: string;
  xMm: number;
  yMm: number;
  anchoMm: number;
  altoMm: number;
  visible: boolean;
}

function cajaDe(formato: FormatoDeCheque, clave: string, etiqueta: string): CajaDelEsquema | null {
  const campo = leerCampo(formato, clave);
  if (!campo) return null;
  const { xMm, yMm } = campo;
  const tamano = campo.tamanoPt ?? formato.letra.tamanoPt;
  return {
    clave,
    etiqueta,
    xMm: xMm + formato.desplazamiento.xMm,
    yMm: yMm + formato.desplazamiento.yMm,
    anchoMm: campo.anchoMm,
    altoMm: altoDeRenglonMm(tamano),
    visible: campo.visible,
  };
}

function cajaDeLaSegundaLinea(formato: FormatoDeCheque): CajaDelEsquema[] {
  const { segundaLinea } = formato.montoEnLetras;
  if (!segundaLinea) return [];
  const alto = altoDeRenglonMm(formato.montoEnLetras.tamanoPt ?? formato.letra.tamanoPt);
  return [
    {
      clave: 'montoEnLetras2',
      etiqueta: 'Monto en letras (segundo renglón)',
      xMm: segundaLinea.xMm + formato.desplazamiento.xMm,
      yMm: segundaLinea.yMm + formato.desplazamiento.yMm,
      anchoMm: segundaLinea.anchoMm,
      altoMm: alto,
      visible: formato.montoEnLetras.visible,
    },
  ];
}

/** Los rectángulos de todos los campos del formato, para dibujar su esquema a escala en el editor. */
export function cajasDelFormato(formato: FormatoDeCheque): CajaDelEsquema[] {
  const cajas = entradasDelFormato(formato)
    .map((entrada) => cajaDe(formato, entrada.clave, entrada.etiqueta))
    .filter((caja): caja is CajaDelEsquema => caja !== null);
  return [...cajas, ...cajaDeLaSegundaLinea(formato)];
}
