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
const notaDeDebito = deLaFamilia('nota_de_debito');
const pequenoElectronico = deLaFamilia('factura_pequeno_contribuyente_electronico', { derogado: true });
const agropecuario = deLaFamilia('factura_contribuyente_agropecuario', { derogado: true });
const recibo = deLaFamilia('recibo');

/** Los códigos que ofrece el formulario, agrupados por familia. Los nombres de FAPE, FCPE y FAAE están por confirmar en el Libro de Reglas FEL. */
export const TIPOS_SAT: TipoSat[] = [
  factura('FACT', 'Factura'),
  factura('FCAM', 'Factura cambiaria'),
  pequeno('FPEQ', 'Factura pequeño contribuyente'),
  pequeno('FCAP', 'Factura cambiaria pequeño contribuyente'),
  primarioPecuario('FARP', 'Factura contribuyente régimen primario'),
  primarioPecuario('FCRP', 'Factura cambiaria contribuyente régimen primario'),
  primarioPecuario('FPEC', 'Factura contribuyente régimen pecuario'),
  primarioPecuario('FCPC', 'Factura cambiaria contribuyente régimen pecuario'),
  especial('FESP', 'Factura especial'),
  notaDeCredito('NCRE', 'Nota de crédito'),
  notaDeDebito('NDEB', 'Nota de débito'),
  pequenoElectronico('FAPE', 'Factura pequeño contribuyente régimen electrónico'),
  pequenoElectronico('FCPE', 'Factura cambiaria pequeño contribuyente régimen electrónico'),
  agropecuario('FACA', 'Factura contribuyente agropecuario'),
  agropecuario('FCCA', 'Factura cambiaria contribuyente agropecuario'),
  agropecuario('FAAE', 'Factura contribuyente agropecuario régimen electrónico especial'),
  agropecuario('FCAE', 'Factura cambiaria contribuyente agropecuario régimen electrónico especial'),
  recibo('RECI', 'Recibo'),
  recibo('RDON', 'Recibo por donación'),
];

/** El nombre de cada grupo del selector. */
export const GRUPOS_DE_TIPOS_SAT: Record<TipoDeDocumento, string> = {
  factura: 'Facturas',
  factura_pequeno_contribuyente: 'Pequeño contribuyente',
  factura_primario_pecuario: 'Productor primario o pecuario',
  factura_especial: 'Factura especial',
  nota_de_credito: 'Notas de crédito',
  nota_de_debito: 'Notas de débito',
  factura_pequeno_contribuyente_electronico: 'Pequeño contribuyente electrónico (derogado)',
  factura_contribuyente_agropecuario: 'Contribuyente agropecuario (derogado)',
  recibo: 'Recibos',
};

/** Si el código es un recibo FEL (`RECI`, `RDON`): el recibo a nombre de la empresa, que va fuera del libro de IVA. */
export const esReciboFel = (codigo: string): boolean =>
  familiaDelCodigo(codigo) === 'recibo' && codigo !== CODIGO_DE_RECIBO;

/** Si el código es el de la factura especial, que la emite la empresa y no el proveedor. */
export const esFacturaEspecial = (codigo: string): boolean => familiaDelCodigo(codigo) === 'factura_especial';

/** Si el código es el de una nota de débito del proveedor, que siempre va en el libro y aumenta una factura. */
export const esNotaDeDebito = (codigo: string): boolean => familiaDelCodigo(codigo) === 'nota_de_debito';

/** Las notas (de crédito y de débito) corrigen una factura que hay que elegir. */
export const llevaFacturaAfectada = (codigo: string): boolean => {
  const familia = familiaDelCodigo(codigo);
  return familia === 'nota_de_credito' || familia === 'nota_de_debito';
};

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
