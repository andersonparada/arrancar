import { ArticuloConExistencias, UnidadBaseFija } from '../../../dominio/errores.js';
import type { ArticuloDto, SolicitudDeArticulo } from '../../dto/articulo.dto.js';
import type { ConsultasDeUsoDelKardex } from '../../puertos/consultas-de-uso-del-kardex.js';

interface Cambio {
  anterior: ArticuloDto;
  solicitud: SolicitudDeArticulo;
}

/**
 * Lo que el kardex impide cambiar de un artículo.
 * @throws UnidadBaseFija si tiene movimientos y cambia su unidad base o si maneja lotes.
 * @throws ArticuloConExistencias si tiene existencias y se inactiva.
 */
export async function exigirCambioPermitido(uso: ConsultasDeUsoDelKardex, { anterior, solicitud }: Cambio) {
  const cambiaLaForma =
    anterior.unidadBaseId !== solicitud.unidadBaseId || anterior.manejaLotes !== solicitud.manejaLotes;
  if (cambiaLaForma && (await uso.articuloConMovimientos(anterior.id))) throw new UnidadBaseFija();
  const seInactiva = anterior.activo && !solicitud.activo;
  if (seInactiva && (await uso.articuloConExistencias(anterior.id))) throw new ArticuloConExistencias();
}
