export type TipoDePersonaDelProveedor = 'individual' | 'juridica';

const PALABRAS_DE_EMPRESA = [
  'SOCIEDAD',
  'LIMITADA',
  'LTDA',
  'COMPANIA',
  'CORPORACION',
  'ASOCIACION',
  'FUNDACION',
  'COOPERATIVA',
  'EMPRESA',
];
const SIGLAS_DE_EMPRESA = ['S A', 'SA', 'S R L', 'SRL', 'S A S', 'SAS'];
const EMPRESA = new RegExp(`\\b(${[...PALABRAS_DE_EMPRESA, ...SIGLAS_DE_EMPRESA].join('|')})\\b`);

/**
 * El tipo de persona que se propone para un proveedor nuevo según el nombre que trae el DTE: jurídica si dice «S.A.»,
 * «Sociedad», «Limitada»..., individual si no. Solo es una propuesta; si el usuario no la cambia, se usa esta.
 */
export function tipoDePersonaDelNombre(nombre: string): TipoDePersonaDelProveedor {
  const sinTildes = nombre.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const palabras = sinTildes.toUpperCase().replace(/[^A-Z0-9]+/g, ' ');
  return EMPRESA.test(palabras) ? 'juridica' : 'individual';
}
