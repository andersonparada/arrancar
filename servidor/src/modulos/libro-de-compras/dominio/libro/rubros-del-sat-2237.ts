import type { MotivoSinCredito, TipoDeDocumento } from '../tipos-de-documento.js';
import type { CategoriaDeLinea, DocumentoDelLibro } from './documento-del-libro.js';

export const CLAVES_DE_RUBRO = [
  'combustibles',
  'activos_fijos',
  'servicios',
  'otras_compras',
  'importaciones',
  'pequeno_contribuyente',
  'regimenes_sin_iva',
  'exento_y_no_afecto',
  'combustibles_exentos',
] as const;
export type ClaveDeRubro = (typeof CLAVES_DE_RUBRO)[number];

const NOMBRES: Record<ClaveDeRubro, string> = {
  combustibles: 'Combustibles',
  activos_fijos: 'Activos fijos',
  servicios: 'Servicios',
  otras_compras: 'Otras compras (bienes)',
  importaciones: 'Importaciones',
  pequeno_contribuyente: 'Pequeño contribuyente',
  regimenes_sin_iva: 'Regímenes sin IVA',
  exento_y_no_afecto: 'Exento y no afecto',
  combustibles_exentos: 'Combustible exento (Decreto 22-2026)',
};

const NOTAS: Partial<Record<ClaveDeRubro, string>> = {
  importaciones: 'Sin DUCA en Arrancar: siempre en cero.',
  combustibles_exentos: 'Informativo: ya está incluido en «Exento y no afecto».',
};

/** Base e IVA con crédito en centavos y con signo. */
export interface MontoDeRubro {
  base: number;
  iva: number;
}

export interface RubroDelSat2237 {
  clave: ClaveDeRubro;
  nombre: string;
  nota: string | null;
  /** Facturas y facturas especiales. */
  facturas: MontoDeRubro;
  notasDeDebito: MontoDeRubro;
  /** En negativo: restan. */
  notasDeCredito: MontoDeRubro;
  neto: MontoDeRubro;
}

interface Aporte {
  clave: ClaveDeRubro;
  base: number;
  iva: number;
}

const RUBRO_DE_CATEGORIA: Record<CategoriaDeLinea, ClaveDeRubro> = {
  bien: 'otras_compras',
  servicio: 'servicios',
  combustible: 'combustibles',
  activo_fijo: 'activos_fijos',
};

function rubroSinIva(motivo: MotivoSinCredito | null): ClaveDeRubro | null {
  if (motivo === 'pequeno_contribuyente') return 'pequeno_contribuyente';
  if (motivo === 'primario_pecuario' || motivo === 'contribuyente_agropecuario') return 'regimenes_sin_iva';
  return null;
}

/** Las compras del documento por rubro (sin signo): con crédito, por categoría; sin IVA, por régimen. */
function aportesDeCompra(documento: DocumentoDelLibro): Aporte[] {
  const sinIva = rubroSinIva(documento.motivoSinCredito);
  if (sinIva) return [{ clave: sinIva, base: documento.base, iva: 0 }];
  if (documento.motivoSinCredito !== null) return [];
  return documento.categorias.map((c) => ({
    clave: RUBRO_DE_CATEGORIA[c.categoria],
    base: c.base,
    iva: c.iva - c.ivaNoAcreditable,
  }));
}

function aportesDeExento(documento: DocumentoDelLibro): Aporte[] {
  const exento = documento.exento + documento.otrosImpuestos;
  const delDecreto = documento.categorias.filter((c) => c.combustibleExento).reduce((s, c) => s + c.exentoYNoAfecto, 0);
  const aportes: Aporte[] = [];
  if (exento !== 0) aportes.push({ clave: 'exento_y_no_afecto', base: exento, iva: 0 });
  if (delDecreto !== 0) aportes.push({ clave: 'combustibles_exentos', base: delDecreto, iva: 0 });
  return aportes;
}

const sumar = (a: MontoDeRubro, b: MontoDeRubro): MontoDeRubro => ({ base: a.base + b.base, iva: a.iva + b.iva });

const CERO: MontoDeRubro = { base: 0, iva: 0 };

type Grupo = 'facturas' | 'notasDeDebito' | 'notasDeCredito';

function grupoDe(tipo: TipoDeDocumento): Grupo {
  if (tipo === 'nota_de_credito') return 'notasDeCredito';
  return tipo === 'nota_de_debito' ? 'notasDeDebito' : 'facturas';
}

function rubroVacio(clave: ClaveDeRubro): RubroDelSat2237 {
  return {
    clave,
    nombre: NOMBRES[clave],
    nota: NOTAS[clave] ?? null,
    facturas: CERO,
    notasDeDebito: CERO,
    notasDeCredito: CERO,
    neto: CERO,
  };
}

/**
 * Los rubros del SAT-2237 con nombre propio, siempre todos y en el mismo orden. Las notas de crédito restan; solo los
 * documentos con crédito entran a los rubros del crédito. Medicamentos y vehículos no se separan.
 */
export function rubrosDelSat2237(documentos: DocumentoDelLibro[]): RubroDelSat2237[] {
  const rubros = new Map(CLAVES_DE_RUBRO.map((clave) => [clave, rubroVacio(clave)]));
  for (const documento of documentos) {
    const grupo = grupoDe(documento.tipo);
    const signo = grupo === 'notasDeCredito' ? -1 : 1;
    for (const { clave, base, iva } of [...aportesDeCompra(documento), ...aportesDeExento(documento)]) {
      const rubro = rubros.get(clave)!;
      const monto = { base: signo * base, iva: signo * iva };
      rubros.set(clave, { ...rubro, [grupo]: sumar(rubro[grupo], monto), neto: sumar(rubro.neto, monto) });
    }
  }
  return [...rubros.values()];
}
