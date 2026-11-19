import { and, asc, eq, gte, inArray, lte } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { movimientos } from '../../../bancos/infraestructura/persistencia/movimientos.tablas.js';
import type {
  ComprobanteDeReporte,
  FiltroDePeriodo,
  ReposicionDeReporte,
} from '../../aplicacion/puertos/puertos-de-reportes.js';
import { comprobantesConSuContexto } from './comprobantes.lectura.js';
import { comprobantes } from './comprobantes.tablas.js';
import { aReposicion } from './repositorio-de-reposiciones.drizzle.js';
import { conFondoYConcepto, nombresDeFondos } from './reportes-de-comprobantes.lectura.js';
import { reposicionComprobantes } from './reposicion-comprobantes.tablas.js';
import { reposiciones } from './reposiciones.tablas.js';

/** El número del cheque (su referencia) o el de la nota de Bancos. */
const referenciaDe = (referencia: string | null, numero: number | null): string | null =>
  referencia ?? (numero === null ? null : String(numero));

/** Los comprobantes de las reposiciones, con su fondo y concepto, por id. */
async function comprobantesDeLasLineas(ids: readonly string[]): Promise<Map<string, ComprobanteDeReporte>> {
  if (ids.length === 0) return new Map();
  const filas = await comprobantesConSuContexto().where(inArray(comprobantes.id, [...ids]));
  const resueltos = await conFondoYConcepto(filas);
  return new Map(resueltos.map((resuelto) => [resuelto.comprobante.id, resuelto]));
}

/** Las reposiciones vigentes del período con el cheque o la nota de Bancos que las respalda. */
function reposicionesConRespaldo({ desde, hasta, fondoId }: FiltroDePeriodo) {
  return transaccionEnCurso()
    .select({ reposicion: reposiciones, referencia: movimientos.referencia, numero: movimientos.numero })
    .from(reposiciones)
    .leftJoin(movimientos, eq(movimientos.id, reposiciones.movimientoId))
    .where(
      and(
        eq(reposiciones.estado, 'vigente'),
        gte(reposiciones.fecha, desde),
        lte(reposiciones.fecha, hasta),
        fondoId ? eq(reposiciones.fondoId, fondoId) : undefined,
      ),
    )
    .orderBy(asc(reposiciones.fecha), asc(reposiciones.numero));
}

/** Las líneas vigentes de las reposiciones, con su comprobante resuelto. */
async function lineasDe(ids: readonly string[]) {
  const lineas = await transaccionEnCurso()
    .select()
    .from(reposicionComprobantes)
    .where(and(inArray(reposicionComprobantes.reposicionId, [...ids]), eq(reposicionComprobantes.vigente, true)));
  const deComprobantes = await comprobantesDeLasLineas(lineas.map(({ comprobanteId }) => comprobanteId));
  return lineas.flatMap((linea) => {
    const comprobante = deComprobantes.get(linea.comprobanteId);
    return comprobante
      ? [{ reposicionId: linea.reposicionId, comprobante, montoCentavos: aCentavos(linea.monto) }]
      : [];
  });
}

/** CC-R2: las reposiciones vigentes del período, con su respaldo de Bancos y los comprobantes que cubren. */
export async function reposicionesDelPeriodoDe(filtro: FiltroDePeriodo): Promise<ReposicionDeReporte[]> {
  const filas = await reposicionesConRespaldo(filtro);
  if (filas.length === 0) return [];
  const [lineas, deFondos] = await Promise.all([
    lineasDe(filas.map(({ reposicion }) => reposicion.id)),
    nombresDeFondos([...new Set(filas.map(({ reposicion }) => reposicion.fondoId))]),
  ]);
  return filas.map(({ reposicion, referencia, numero }) => ({
    reposicion: aReposicion(reposicion),
    fondoNombre: deFondos.get(reposicion.fondoId) ?? '',
    referenciaDeBancos: referenciaDe(referencia, numero),
    lineas: lineas
      .filter((linea) => linea.reposicionId === reposicion.id)
      .map(({ comprobante, montoCentavos }) => ({ comprobante, montoCentavos })),
  }));
}
