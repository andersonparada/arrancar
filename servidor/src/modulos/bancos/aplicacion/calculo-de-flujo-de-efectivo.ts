import { aCentavos, deCentavos } from '../dominio/centavos.js';
import type {
  ActividadDelFlujo,
  ActividadDelFlujoDto,
  ClaveDeLineaAparte,
  ControlDeCuadreDto,
  LineaAparteDto,
  LineaDeFlujoDto,
  ReporteDeFlujoDeEfectivoDto,
  SaldosDelRango,
  TotalesDeUnConcepto,
} from './dto/reportes-por-concepto.dto.js';

/** Dónde cae un concepto en el reporte: en una actividad, en una línea aparte o en la apertura de cuentas. */
export type Ubicacion =
  | { donde: 'apertura' }
  | { donde: 'aparte'; clave: ClaveDeLineaAparte }
  | { donde: 'actividad'; actividad: ActividadDelFlujo; etiqueta: string };

const ACTIVIDADES: readonly ActividadDelFlujo[] = ['operacion', 'inversion', 'financiamiento'];

const APARTE_POR_CLAVE_DE_SISTEMA: Record<string, ClaveDeLineaAparte> = {
  transferencia: 'transferencias',
  sin_clasificar: 'sin_clasificar',
};

export const ETIQUETAS_APARTE: Record<ClaveDeLineaAparte, string> = {
  transferencias: 'Transferencias entre cuentas propias',
  sin_actividad: 'Otros movimientos sin actividad',
  sin_clasificar: 'Sin clasificar (pendiente)',
};

/** El saldo inicial es apertura, no flujo; las transferencias y lo sin clasificar van aparte; el resto, por actividad. */
export function ubicarEnElFlujo(concepto: TotalesDeUnConcepto): Ubicacion {
  const { claveDeSistema, actividadDeFlujo } = concepto;
  if (claveDeSistema === 'saldo_inicial') return { donde: 'apertura' };
  const clave = claveDeSistema ? APARTE_POR_CLAVE_DE_SISTEMA[claveDeSistema] : undefined;
  if (clave) return { donde: 'aparte', clave };
  if (actividadDeFlujo === 'ninguna') return { donde: 'aparte', clave: 'sin_actividad' };
  return {
    donde: 'actividad',
    actividad: actividadDeFlujo,
    etiqueta: concepto.grupoDeFlujo ?? concepto.conceptoNombre,
  };
}

interface Acumulado {
  entradas: number;
  salidas: number;
  cantidad: number;
}

interface Ubicado {
  totales: TotalesDeUnConcepto;
  ubicacion: Ubicacion;
}

const netoDe = ({ entradas, salidas }: Acumulado): number => entradas - salidas;

function acumular(lista: readonly TotalesDeUnConcepto[]): Acumulado {
  return lista.reduce<Acumulado>(
    (suma, t) => ({
      entradas: suma.entradas + aCentavos(t.entradas),
      salidas: suma.salidas + aCentavos(t.salidas),
      cantidad: suma.cantidad + t.cantidad,
    }),
    { entradas: 0, salidas: 0, cantidad: 0 },
  );
}

const aLinea = (etiqueta: string, acumulado: Acumulado): LineaDeFlujoDto => ({
  etiqueta,
  entradas: deCentavos(acumulado.entradas),
  salidas: deCentavos(acumulado.salidas),
  neto: deCentavos(netoDe(acumulado)),
  cantidad: acumulado.cantidad,
});

/** Las líneas de una actividad: los conceptos con el mismo grupo se juntan en una; por nombre. */
function armarActividad(actividad: ActividadDelFlujo, ubicados: readonly Ubicado[]): ActividadDelFlujoDto {
  const porEtiqueta = new Map<string, TotalesDeUnConcepto[]>();
  for (const { totales, ubicacion } of ubicados) {
    if (ubicacion.donde !== 'actividad' || ubicacion.actividad !== actividad) continue;
    porEtiqueta.set(ubicacion.etiqueta, [...(porEtiqueta.get(ubicacion.etiqueta) ?? []), totales]);
  }
  const lineas = [...porEtiqueta.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'es'))
    .map(([etiqueta, lista]) => aLinea(etiqueta, acumular(lista)));
  const total = acumular([...porEtiqueta.values()].flat());
  return {
    actividad,
    lineas,
    entradas: deCentavos(total.entradas),
    salidas: deCentavos(total.salidas),
    neto: deCentavos(netoDe(total)),
  };
}

const enAparte = (ubicados: readonly Ubicado[], clave: ClaveDeLineaAparte): TotalesDeUnConcepto[] =>
  ubicados.filter(({ ubicacion }) => ubicacion.donde === 'aparte' && ubicacion.clave === clave).map((u) => u.totales);

/**
 * «Sin clasificar» se muestra siempre (con su enlace a la bandeja); los otros solo si tienen algo. Con todas las
 * cuentas, las transferencias propias se anulan entre sí y se ocultan; si no se anularan, se muestran para que se vea.
 */
function armarLineasAparte(ubicados: readonly Ubicado[], todasLasCuentas: boolean): LineaAparteDto[] {
  const claves: ClaveDeLineaAparte[] = ['transferencias', 'sin_actividad', 'sin_clasificar'];
  return claves.flatMap((clave) => {
    const acumulado = acumular(enAparte(ubicados, clave));
    const vacia = acumulado.entradas === 0 && acumulado.salidas === 0 && acumulado.cantidad === 0;
    const seOculta = clave === 'transferencias' && todasLasCuentas && netoDe(acumulado) === 0;
    if ((vacia && clave !== 'sin_clasificar') || seOculta) return [];
    return [{ clave, ...aLinea(ETIQUETAS_APARTE[clave], acumulado) }];
  });
}

function armarControl(saldos: SaldosDelRango, apertura: number, flujoNeto: number): ControlDeCuadreDto {
  const saldoCalculado = aCentavos(saldos.saldoAlInicio) + apertura + flujoNeto;
  const diferencia = aCentavos(saldos.saldoAlFinal) - saldoCalculado;
  return {
    saldoAlInicio: saldos.saldoAlInicio,
    saldosInicialesDelRango: deCentavos(apertura),
    flujoNeto: deCentavos(flujoNeto),
    saldoCalculado: deCentavos(saldoCalculado),
    saldoAlFinal: saldos.saldoAlFinal,
    diferencia: deCentavos(diferencia),
    cuadra: diferencia === 0,
  };
}

export interface MarcoDelFlujo {
  desde: string;
  hasta: string;
  /** Nulo si son todas las cuentas de la empresa. */
  cuentaBancariaId: string | null;
}

/**
 * El flujo de efectivo por el método directo: por actividad y grupo, con lo aparte que hace falta para cuadrar y el
 * control saldo al inicio + apertura + flujo = saldo al final. Todo en centavos enteros.
 */
export function armarFlujoDeEfectivo(
  totales: readonly TotalesDeUnConcepto[],
  saldos: SaldosDelRango,
  marco: MarcoDelFlujo,
): ReporteDeFlujoDeEfectivoDto {
  const ubicados = totales.map((t) => ({ totales: t, ubicacion: ubicarEnElFlujo(t) }));
  const esApertura = ({ ubicacion }: Ubicado) => ubicacion.donde === 'apertura';
  const apertura = netoDe(acumular(ubicados.filter(esApertura).map((u) => u.totales)));
  const flujoNeto = netoDe(acumular(ubicados.filter((u) => !esApertura(u)).map((u) => u.totales)));
  return {
    ...marco,
    actividades: ACTIVIDADES.map((actividad) => armarActividad(actividad, ubicados)),
    lineasAparte: armarLineasAparte(ubicados, marco.cuentaBancariaId === null),
    control: armarControl(saldos, apertura, flujoNeto),
  };
}
