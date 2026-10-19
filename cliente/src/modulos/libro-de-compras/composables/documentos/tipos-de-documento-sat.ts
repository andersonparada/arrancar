import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import type { TipoDeDocumento } from '../../servicios/documentos.api';
import { FECHA_DE_DEROGACION_REGIMENES_DECRETO_7_2019, mesDeFecha } from '../../textos-de-documentos';

/** Lo que el selector guarda para un recibo: no es un documento FEL, así que no tiene código de la SAT. */
export const CODIGO_DE_RECIBO = 'RECIBO';

/** Un código de la SAT tal como lo imprime el encabezado de la factura electrónica. */
export interface TipoSat {
  codigo: string;
  nombre: string;
  familia: TipoDeDocumento;
  /** Régimen derogado: solo vale para lo emitido antes de la fecha de derogación (el servidor decide). */
  derogado?: boolean;
}

const deLaFamilia =
  (familia: TipoDeDocumento, extra: Partial<TipoSat> = {}) =>
  (codigo: string, nombre: string): TipoSat => ({ codigo, nombre, familia, ...extra });

const factura = deLaFamilia('factura');
const pequeno = deLaFamilia('factura_pequeno_contribuyente');
const primarioPecuario = deLaFamilia('factura_primario_pecuario');
const especial = deLaFamilia('factura_especial');
const notaDeCredito = deLaFamilia('nota_de_credito');
const pequenoElectronico = deLaFamilia('factura_pequeno_contribuyente_electronico', { derogado: true });
const agropecuario = deLaFamilia('factura_contribuyente_agropecuario', { derogado: true });

/** Los códigos que ofrece el formulario, agrupados por familia (los nombres por confirmar con el contador, R2-f). */
export const TIPOS_SAT: TipoSat[] = [
  factura('FACT', 'Factura'),
  factura('FCAM', 'Factura cambiaria'),
  pequeno('FPEQ', 'Factura de pequeño contribuyente'),
  pequeno('FCAP', 'Factura cambiaria de pequeño contribuyente'),
  primarioPecuario('FARP', 'Factura contribuyente régimen primario'),
  primarioPecuario('FCRP', 'Factura cambiaria contribuyente régimen primario'),
  primarioPecuario('FPEC', 'Factura contribuyente régimen pecuario'),
  primarioPecuario('FCPC', 'Factura cambiaria contribuyente régimen pecuario'),
  especial('FESP', 'Factura especial'),
  notaDeCredito('NCRE', 'Nota de crédito'),
  pequenoElectronico('FAPE', 'Factura de pequeño contribuyente electrónico'),
  pequenoElectronico('FCPE', 'Factura cambiaria de pequeño contribuyente electrónico'),
  agropecuario('FACA', 'Factura de contribuyente agropecuario'),
  agropecuario('FCCA', 'Factura cambiaria de contribuyente agropecuario'),
  agropecuario('FAAE', 'Factura de contribuyente agropecuario electrónico'),
  agropecuario('FCAE', 'Factura cambiaria de contribuyente agropecuario electrónico'),
];

/** El nombre de cada grupo del selector. */
export const GRUPOS_DE_TIPOS_SAT: Record<TipoDeDocumento, string> = {
  factura: 'Facturas',
  factura_pequeno_contribuyente: 'Pequeño contribuyente',
  factura_primario_pecuario: 'Productor primario o pecuario',
  factura_especial: 'Factura especial',
  nota_de_credito: 'Notas de crédito',
  factura_pequeno_contribuyente_electronico: 'Pequeño contribuyente electrónico (derogado)',
  factura_contribuyente_agropecuario: 'Contribuyente agropecuario (derogado)',
  recibo: 'Sin FEL',
};

/** Si el código es el de la factura especial, que la emite la empresa y no el proveedor. */
export const esFacturaEspecial = (codigo: string): boolean => familiaDelCodigo(codigo) === 'factura_especial';

/** La familia a la que pertenece un código del selector; `null` si no hay ninguno elegido o no se conoce. */
export function familiaDelCodigo(codigo: string): TipoDeDocumento | null {
  if (codigo === CODIGO_DE_RECIBO) return 'recibo';
  return TIPOS_SAT.find((tipoSat) => tipoSat.codigo === codigo)?.familia ?? null;
}

function textoDelTipo({ codigo, nombre, derogado }: TipoSat): string {
  const hasta = mesDeFecha(FECHA_DE_DEROGACION_REGIMENES_DECRETO_7_2019);
  return derogado ? `${codigo} — ${nombre} (régimen derogado, solo antes de ${hasta})` : `${codigo} — ${nombre}`;
}

/** Las opciones del selector «Tipo de documento»: por familia, con el recibo sin FEL al final. */
export function opcionesDeTipoSat(): (OpcionBuscable<string> & { grupo: string })[] {
  const opciones = TIPOS_SAT.map((tipoSat) => ({
    valor: tipoSat.codigo,
    texto: textoDelTipo(tipoSat),
    grupo: GRUPOS_DE_TIPOS_SAT[tipoSat.familia],
  }));
  return [...opciones, { valor: CODIGO_DE_RECIBO, texto: 'Recibo (sin FEL)', grupo: GRUPOS_DE_TIPOS_SAT.recibo }];
}
