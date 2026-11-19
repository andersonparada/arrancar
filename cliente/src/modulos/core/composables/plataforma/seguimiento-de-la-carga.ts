import type { ConsultaDeLaLista } from '../../servicios/monedas.api';
import type { ConsultaDeLaCarga, EstadoDeLaCarga, ResumenDeCarga } from '../../servicios/tipos-de-cambio.api';

const CADA_CUANTO_PREGUNTAR_EN_MS = 2000;
const MAXIMO_DE_PREGUNTAS = 300;

interface OpcionesDeEspera {
  pedirEstado: () => Promise<EstadoDeLaCarga>;
  esperar?: (milisegundos: number) => Promise<void>;
}

const dormir = (milisegundos: number) => new Promise<void>((seguir) => setTimeout(seguir, milisegundos));

/**
 * Pregunta cada 2 segundos al servidor hasta que ninguna carga corra (la lista y «Cargar ahora» van en segundo
 * plano) y devuelve el último estado, con la bitácora ya completa.
 * @throws Error si pasan 10 minutos y sigue corriendo.
 */
export async function esperarElFinDeLaCarga({
  pedirEstado,
  esperar = dormir,
}: OpcionesDeEspera): Promise<EstadoDeLaCarga> {
  for (let pregunta = 0; pregunta < MAXIMO_DE_PREGUNTAS; pregunta++) {
    await esperar(CADA_CUANTO_PREGUNTAR_EN_MS);
    const estado = await pedirEstado();
    if (!estado.enCurso) return estado;
  }
  throw new Error('La carga sigue corriendo. Revise la bitácora en unos minutos.');
}

/** Las consultas pedidas por una persona de la vuelta dada, hechas desde `iniciadaEn`, de la más vieja a la nueva. */
export function consultasDeLaCarga(
  consultas: ConsultaDeLaCarga[],
  vuelta: 'manual' | 'lista',
  iniciadaEn: string,
): ConsultaDeLaCarga[] {
  const desde = Date.parse(iniciadaEn);
  return consultas
    .filter((c) => c.aPedido && c.vuelta === vuelta && Date.parse(c.iniciadaEn) >= desde)
    .sort((a, b) => Date.parse(a.iniciadaEn) - Date.parse(b.iniciadaEn));
}

/** Lo que dejó «Cargar ahora» por moneda, tomado de la bitácora. */
export function resumenesDeLaCarga(consultas: ConsultaDeLaCarga[], iniciadaEn: string): ResumenDeCarga[] {
  return consultasDeLaCarga(consultas, 'manual', iniciadaEn).flatMap((c) =>
    c.moneda
      ? [
          {
            moneda: c.moneda,
            resultado: c.resultado,
            filasNuevas: c.filasNuevas,
            filasRechazadas: c.filasRechazadas,
            desde: c.desde ?? '',
            hasta: c.hasta ?? '',
          },
        ]
      : [],
  );
}

/** Lo que dejó «Actualizar lista», tomado de la bitácora; la bitácora no guarda cuántas quedaron no disponibles. */
export function resultadoDeLaLista(consultas: ConsultaDeLaCarga[], iniciadaEn: string): ConsultaDeLaLista | null {
  const consulta = consultasDeLaCarga(consultas, 'lista', iniciadaEn).at(-1);
  if (!consulta) return null;
  return {
    resultado: consulta.resultado,
    nuevas: consulta.filasNuevas,
    noDisponibles: 0,
    detalle: consulta.detalle,
    hechaEn: consulta.terminadaEn,
  };
}
