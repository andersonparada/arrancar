import { normalizarAQuetzales } from './cruces-del-banguat.js';
import type {
  ConvencionDePublicacion,
  MotivoDeRechazo,
  PublicacionDeTipoDeCambio,
  PublicacionRechazada,
} from './publicacion.js';

/** La fila del dólar del Banguat de una fecha: su identificador y su referencia en quetzales. */
export interface DolarDelDia {
  readonly id: string;
  readonly referencia: string;
}

export interface OpcionesDeNormalizacion {
  readonly publicaciones: readonly PublicacionDeTipoDeCambio[];
  /** Cómo publica el Banguat esta moneda. */
  readonly convencion: ConvencionDePublicacion;
  /** El dólar del Banguat guardado, por fecha. */
  readonly dolares: ReadonlyMap<string, DolarDelDia>;
}

/** Las publicaciones ya en quetzales por unidad, y las que no se pueden pasar (sin dólar de su día, o cálculo inválido). */
export interface Normalizacion {
  readonly normalizadas: PublicacionDeTipoDeCambio[];
  readonly rechazadas: PublicacionRechazada[];
}

function normalizar(
  publicacion: PublicacionDeTipoDeCambio,
  convencion: ConvencionDePublicacion,
  dolar: DolarDelDia | undefined,
): PublicacionDeTipoDeCambio | MotivoDeRechazo {
  if (!dolar) return 'sin_dolar_del_dia';
  const referencia = normalizarAQuetzales({ convencion, promedio: publicacion.referencia, dolar: dolar.referencia });
  if (referencia === undefined) return 'dato_invalido';
  return { ...publicacion, referencia, convencion, dolarUsadoId: dolar.id };
}

/**
 * Pasa a quetzales por unidad lo que publicó el Banguat (adenda B.3 y B.6, comprobación 4): el dólar ya viene en
 * quetzales y solo recibe su convención; las demás monedas se calculan con la fila `banguat` del dólar **de la misma
 * fecha**, nunca con la de otro día. Sin ella la publicación no se guarda y el día sigue siendo un hueco.
 */
export function normalizarPublicaciones(opciones: OpcionesDeNormalizacion): Normalizacion {
  const { publicaciones, convencion, dolares } = opciones;
  const resultado: Normalizacion = { normalizadas: [], rechazadas: [] };
  for (const publicacion of publicaciones) {
    if (convencion === 'quetzales_por_unidad') {
      resultado.normalizadas.push({ ...publicacion, convencion });
      continue;
    }
    const normalizada = normalizar(publicacion, convencion, dolares.get(publicacion.fecha));
    if (typeof normalizada === 'string') {
      resultado.rechazadas.push({ moneda: publicacion.moneda, fecha: publicacion.fecha, motivo: normalizada });
    } else resultado.normalizadas.push(normalizada);
  }
  return resultado;
}
