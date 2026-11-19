import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiFondos } from '../../servicios/fondos.api';
import type { EstadoDelFondo, PaginaDeFondos } from '../../servicios/tipos-de-fondos';
import { usarVentanaDeAccion } from '../usar-ventana-de-accion';
import { cuerpoDeApertura, edicionDeApertura } from './edicion-de-fondo';
import { usarCatalogosDelFondo } from './usar-catalogos-del-fondo';

/** La lista de fondos (los abiertos por omisión) y la ventana de abrir uno nuevo, que lleva a su ficha. */
export function usarListaDeFondos() {
  const router = useRouter();
  const estado = ref<EstadoDelFondo | 'todos'>('abierto');
  const catalogos = usarCatalogosDelFondo();
  const { datos, cargando, cargar } = usarCarga(
    () => apiFondos.listar({ estado: estado.value }),
    { elementos: [], total: 0 } as PaginaDeFondos,
    'No se pudieron cargar los fondos.',
  );
  watch(estado, cargar);

  const apertura = usarVentanaDeAccion({
    inicial: edicionDeApertura,
    alAbrir: catalogos.cargar,
    enviar: (edicion) => apiFondos.abrir(cuerpoDeApertura(edicion)),
    exito: (fondo) => `Fondo «${fondo.nombre}» abierto.`,
    alTerminar: (fondo) => void router.push({ name: 'caja-chica.fondos.ficha', params: { id: fondo.id } }),
  });

  return { estado, fondos: datos, cargando, apertura, catalogos };
}
