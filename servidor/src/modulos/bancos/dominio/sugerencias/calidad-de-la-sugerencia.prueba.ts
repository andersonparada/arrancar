import { describe, expect, it } from 'vitest';
import { armarCasos } from './casos-de-votacion.js';
import { CONFIANZA_MINIMA_POR_OMISION, VIDA_MEDIA_POR_OMISION } from './constantes.js';
import type { ConceptoOfrecible, Ejemplo } from './tipos.js';
import { votar } from './votacion.js';

/**
 * Regresión de calidad: un año sintético de un rancho (2026). Se aprende de los primeros nueve meses y se mide
 * en los tres siguientes con los valores por omisión. Si al tocar parámetros esto empeora, hay que pensarlo.
 */
const CONCEPTOS: ConceptoOfrecible[] = [
  'planilla',
  'igss',
  'insumos',
  'mantenimiento',
  'sanidad',
  'comisiones',
  'pago_de_prestamo',
  'intereses',
  'aporte',
  'retiro',
].map((id) => ({ id, nombre: id }));

interface Movimiento extends Ejemplo {
  esperado: string;
}

const fecha = (mes: number, dia: number) => `2026-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

let contador = 0;
/** Una variación determinista (sin azar) para que los montos no sean todos idénticos. */
const variacion = (base: number, porcentaje: number) =>
  Math.round(base * (1 + (((contador * 37) % 21) - 10) * (porcentaje / 1000)));

function movimiento(
  datos: Partial<Movimiento> & Pick<Movimiento, 'fecha' | 'conceptoId' | 'montoEnCentavos'>,
): Movimiento {
  contador += 1;
  return {
    id: `m${contador}`,
    direccion: 'salida',
    cuentaBancariaId: 'monetaria',
    beneficiarioParaComparar: null,
    textoParaComparar: null,
    esperado: datos.conceptoId,
    ...datos,
  };
}

interface DatosDelMes extends Partial<Movimiento> {
  beneficiario: string | null;
  conceptoId: string;
  dia: number;
  monto: number;
}

function delMes(mes: number): Movimiento[] {
  const con = ({ beneficiario, conceptoId, dia, monto, ...extra }: DatosDelMes) =>
    movimiento({
      fecha: fecha(mes, dia),
      conceptoId,
      montoEnCentavos: variacion(monto, 5),
      beneficiarioParaComparar: beneficiario,
      ...extra,
    });
  return [
    con({ beneficiario: 'trabajadores', conceptoId: 'planilla', dia: 15, monto: 1_800_000 }),
    con({ beneficiario: 'trabajadores', conceptoId: 'planilla', dia: 28, monto: 1_800_000 }),
    con({ beneficiario: 'igss', conceptoId: 'igss', dia: 10, monto: 270_000 }),
    con({ beneficiario: 'agroservicios rancho', conceptoId: 'insumos', dia: 5, monto: 350_000 }),
    con({ beneficiario: 'agroservicios rancho', conceptoId: 'insumos', dia: 20, monto: 420_000 }),
    con({ beneficiario: 'ferreteria pinos', conceptoId: 'mantenimiento', dia: 8, monto: 60_000 }),
    con({ beneficiario: 'veterinaria central', conceptoId: 'sanidad', dia: 12, monto: 90_000 }),
    con({ beneficiario: null, conceptoId: 'comisiones', dia: 30, monto: 3_000, textoParaComparar: 'comision mensual' }),
    con({
      beneficiario: null,
      conceptoId: 'pago_de_prestamo',
      dia: 25,
      monto: 500_000,
      textoParaComparar: 'cuota prestamo',
    }),
    con({
      beneficiario: null,
      conceptoId: 'intereses',
      dia: 30,
      monto: 4_500,
      direccion: 'entrada',
      textoParaComparar: 'intereses ganados',
    }),
    con({ beneficiario: 'juan perez', conceptoId: 'aporte', dia: 3, monto: 2_000_000, direccion: 'entrada' }),
    con({ beneficiario: 'juan perez', conceptoId: 'retiro', dia: 18, monto: 800_000 }),
  ];
}

function medir(aprendizaje: Movimiento[], prueba: Movimiento[]) {
  let sugeridos = 0;
  let aciertos = 0;
  for (const pendiente of prueba) {
    const casos = armarCasos({ ...pendiente, id: null }, aprendizaje, VIDA_MEDIA_POR_OMISION);
    const { sugerido } = votar(casos, CONCEPTOS, { confianzaMinima: CONFIANZA_MINIMA_POR_OMISION });
    if (!sugerido) continue;
    sugeridos += 1;
    if (sugerido.conceptoId === pendiente.esperado) aciertos += 1;
  }
  return { precision: aciertos / sugeridos, cobertura: sugeridos / prueba.length };
}

describe('calidad de las sugerencias con un año sintético', () => {
  const meses = (desde: number, hasta: number) =>
    Array.from({ length: hasta - desde + 1 }, (_, i) => delMes(desde + i)).flat();

  it('con nueve meses de historial: precisión del sugerido de 90 % o más y cobertura de 60 % o más', () => {
    const { precision, cobertura } = medir(meses(1, 9), meses(10, 12));
    expect(precision).toBeGreaterThanOrEqual(0.9);
    expect(cobertura).toBeGreaterThanOrEqual(0.6);
  });
});
