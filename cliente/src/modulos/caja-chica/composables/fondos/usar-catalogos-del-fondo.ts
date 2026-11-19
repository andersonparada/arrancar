import { reactive, ref, toRefs } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { catalogosDeCajaChica, type CatalogosDeCajaChicaDatos } from '../../servicios/catalogos.api';

/**
 * Lo que se elige al abrir un fondo o moverle el dinero: cuentas, chequeras, localidades y usuarios. Se traen una vez,
 * de una sola petición a Caja chica; si falla se avisa y se vuelve a intentar al abrir la ventana otra vez.
 */
export function usarCatalogosDelFondo() {
  const avisos = usarAvisos();
  const datos = reactive<Omit<CatalogosDeCajaChicaDatos, 'conceptosDeGasto'>>({
    cuentas: [],
    chequeras: [],
    localidades: [],
    usuarios: [],
  });
  const cargando = ref(false);
  let cargado = false;

  async function cargar(): Promise<void> {
    if (cargado) return;
    cargando.value = true;
    try {
      Object.assign(datos, await catalogosDeCajaChica.obtener());
      cargado = true;
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudieron cargar las listas para elegir.');
    } finally {
      cargando.value = false;
    }
  }

  return { ...toRefs(datos), cargando, cargar };
}
