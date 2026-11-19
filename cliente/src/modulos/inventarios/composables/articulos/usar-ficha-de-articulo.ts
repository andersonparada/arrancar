import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiArticulos, type Articulo } from '../../servicios/articulos.api';
import { textosDeCatalogo } from '../compartido/textos-de-catalogo';
import { usarAccionesDeCatalogo } from '../compartido/usar-acciones-de-catalogo';
import { datosDeArticulo, edicionDe } from './edicion-de-articulo';
import { usarConversionesDeArticulo } from './usar-conversiones-de-articulo';
import { usarLotesDeArticulo } from './usar-lotes-de-articulo';

const ACCIONES = {
  textos: textosDeCatalogo({
    nombre: 'artículo',
    femenino: false,
    alInactivar: 'Dejará de ofrecerse al registrar movimientos, pero su historial se conserva.',
    sePuedeEliminar: 'si no tiene movimientos',
  }),
  nombreDe: (articulo: Articulo) => articulo.nombre,
  cambiarActivo: (articulo: Articulo, activo: boolean) =>
    apiArticulos.actualizar(articulo.id, datosDeArticulo({ ...edicionDe(articulo), activo })),
  eliminar: (articulo: Articulo) => apiArticulos.eliminar(articulo.id),
};

/** La ficha del artículo: sus datos, sus conversiones y lotes, y lo que puede hacer con él quien lo gestiona. */
export function usarFichaDeArticulo(articuloId: string) {
  const router = useRouter();
  const {
    datos: registro,
    cargando,
    cargar,
  } = usarCarga(() => apiArticulos.obtener(articuloId), null as Articulo | null, 'No se pudo cargar el artículo.');
  const editar = () => router.push({ name: 'inventarios.articulos.editar', params: { articuloId } });
  const acciones = usarAccionesDeCatalogo(ACCIONES, (accion) =>
    accion === 'eliminar' ? router.push({ name: 'inventarios.articulos' }).then(() => undefined) : cargar(),
  );
  const conversiones = usarConversionesDeArticulo(
    articuloId,
    computed(() => registro.value?.unidadBaseId),
  );
  const lotes = usarLotesDeArticulo(articuloId);

  return { registro, cargando, editar, conversiones, lotes, ...acciones };
}
