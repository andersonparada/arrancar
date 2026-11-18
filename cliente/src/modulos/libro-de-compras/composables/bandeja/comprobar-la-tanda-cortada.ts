import { apiDteRecibidos } from '../../servicios/dte-recibidos.api';
import { conLaTandaComprobada, type CorteDeTandas } from './confirmar-por-tandas';
import { consultaDeLaBandeja, filtrosDeLaBandejaVacios } from './datos-de-la-bandeja';

/** Filas por pedido al listar: el máximo que acepta el servidor. */
const FILAS_POR_PEDIDO = 200;

/** Los ids de todas las pendientes, con todas las anteriores incluidas, o `null` si no se pudo preguntar. */
async function idsDeLasPendientes(): Promise<Set<string> | null> {
  const ids = new Set<string>();
  try {
    for (let pagina = 1, paginas = 1; pagina <= paginas; pagina++) {
      const consulta = { ...consultaDeLaBandeja('pendiente', filtrosDeLaBandejaVacios('incluir'), pagina) };
      const respuesta = await apiDteRecibidos.listar({ ...consulta, limite: FILAS_POR_PEDIDO });
      respuesta.elementos.forEach(({ id }) => ids.add(id));
      paginas = Math.ceil(respuesta.total / FILAS_POR_PEDIDO);
    }
  } catch {
    return null;
  }
  return ids;
}

/**
 * Cuando una tanda se cortó, el servidor pudo haber registrado parte de ella. Le pregunta qué sigue pendiente para
 * saber cuáles de esa tanda sí quedaron registrados; si no puede preguntar, el corte queda como estaba.
 */
export async function comprobarLaTandaCortada(corte: CorteDeTandas): Promise<CorteDeTandas> {
  const pendientes = await idsDeLasPendientes();
  if (!pendientes) return corte;
  return conLaTandaComprobada(
    corte,
    corte.deLaTandaQueFallo.filter((id) => !pendientes.has(id)),
  );
}
