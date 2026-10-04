import { aEscala, dividirRedondeando } from './aritmetica-fiscal.js';
import { LineaInvalida } from './errores-de-calculo.js';
import { repartirIva } from './reparto-de-iva.js';

/** La tasa vigente del combustible, tal como la guarda la línea (textos de `numeric`). */
export interface CombustibleDeLinea {
  galones: string;
  idpPorGalon: string;
  porcentajeDeEtanol: string;
}

/** Lo que el usuario escribe en una línea; los montos van en centavos enteros. */
export interface LineaEscrita {
  total: number;
  exento: number;
  combustible?: CombustibleDeLinea | null;
}

/** Una línea con todo lo que se guarda: `total = base + iva + idp + exento`. */
export interface LineaCalculada {
  total: number;
  exento: number;
  idp: number;
  base: number;
  iva: number;
  ivaNoAcreditable: number;
}

/** Cómo se trata el IVA del documento al calcular sus líneas. */
export interface OpcionesDeCalculo {
  /** `false` en pequeño contribuyente y con la casilla SAT desmarcada: no hay IVA, todo va a la base. */
  cobraIva: boolean;
  /** Tasa del IVA en centésimas (12 % → 1200). */
  tasaDeIva: number;
  /** `true` con motivo `fuera_de_plazo` o `no_vinculado`: el IVA de cada línea va a su costo. */
  ivaNoAcreditable: boolean;
  /** IVA total de la FEL, en centavos, si el usuario lo corrige (hasta Q0.05 de diferencia). */
  ivaDeLaFel?: number | null;
}

function exigirCentavos(valor: number, campo: string, minimo: number): void {
  if (!Number.isSafeInteger(valor) || valor < minimo) {
    throw new LineaInvalida(`"${campo}" debe ser un monto en centavos ${minimo === 0 ? 'no negativo' : 'positivo'}.`);
  }
}

/**
 * IDP de un combustible en centavos: `round(galones × idp_por_galon × (100 − etanol) / 100, 2)`,
 * exactamente la fórmula del `check` de la tabla. Galones con hasta 3 decimales, tasa y
 * etanol con hasta 2.
 */
export function calcularIdp(combustible: CombustibleDeLinea): number {
  const milesimas = aEscala(combustible.galones, 3);
  const tasa = aEscala(combustible.idpPorGalon, 2);
  const etanol = aEscala(combustible.porcentajeDeEtanol, 2);
  if (milesimas === null || milesimas <= 0n) throw new LineaInvalida('Los galones deben ser un número mayor a cero.');
  if (tasa === null) throw new LineaInvalida('El IDP por galón debe ser un número sin signo.');
  if (etanol === null || etanol > 10000n) throw new LineaInvalida('El porcentaje de etanol debe estar entre 0 y 100.');
  return Number(dividirRedondeando(milesimas * tasa * (10000n - etanol), 10n ** 7n));
}

/** IDP y gravado (`total − idp − exento`) de una línea; el gravado no puede ser negativo. */
function gravadoDe(linea: LineaEscrita): { idp: number; gravado: number } {
  exigirCentavos(linea.total, 'Total', 1);
  exigirCentavos(linea.exento, 'Exento', 0);
  const idp = linea.combustible ? calcularIdp(linea.combustible) : 0;
  const gravado = linea.total - idp - linea.exento;
  if (gravado < 0) throw new LineaInvalida('El IDP y lo exento de la línea suman más que su total.');
  return { idp, gravado };
}

/**
 * Calcula las líneas de un documento a partir de lo que escribió el usuario. El IVA se saca
 * del documento completo y se reparte entre las líneas (ver `repartirIva`), así que el
 * resultado de una línea depende de las demás.
 */
export function calcularLineas(lineas: readonly LineaEscrita[], opciones: OpcionesDeCalculo): LineaCalculada[] {
  if (lineas.length === 0) throw new LineaInvalida('El documento necesita al menos una línea.');
  const parciales = lineas.map(gravadoDe);
  const gravados = parciales.map((parcial) => parcial.gravado);
  const ivas = opciones.cobraIva
    ? repartirIva(gravados, opciones.tasaDeIva, opciones.ivaDeLaFel)
    : gravados.map(() => 0);
  return lineas.map((linea, indice) => {
    const { idp, gravado } = parciales[indice] ?? { idp: 0, gravado: 0 };
    const iva = ivas[indice] ?? 0;
    return {
      total: linea.total,
      exento: linea.exento,
      idp,
      iva,
      base: gravado - iva,
      ivaNoAcreditable: opciones.ivaNoAcreditable ? iva : 0,
    };
  });
}

/** Costo de la línea (no se guarda): `total − iva + iva_no_acreditable`; incluye IDP y exento. */
export function costoDeLinea(linea: LineaCalculada): number {
  return linea.total - linea.iva + linea.ivaNoAcreditable;
}
