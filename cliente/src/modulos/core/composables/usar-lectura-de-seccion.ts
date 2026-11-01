import { ref, watch, type Ref } from 'vue';

interface LecturaDeSeccion<Valor> {
  /** El registro cuyos datos se leen; `null` si es nuevo (entonces se usan los valores por omisión). */
  registroId: () => string | null;
  traer: (registroId: string) => Promise<Valor>;
  porOmision: () => Valor;
}

/** Lee el valor del registro; devuelve `undefined` si falló o si mientras tanto cambió el registro o el valor. */
async function leer<Valor>(lectura: LecturaDeSeccion<Valor>, id: string, sigueVacio: () => boolean) {
  const valor = await lectura.traer(id);
  return lectura.registroId() === id && sigueVacio() ? valor : undefined;
}

/** Llena de nuevo cuando el registro cambia o cuando el formulario vacía el valor. */
function vigilar<Valor>(modelo: Ref<Valor | undefined>, registroId: () => string | null, llenar: () => void): void {
  watch(
    () => `${registroId()}|${modelo.value === undefined}`,
    () => {
      if (modelo.value === undefined) llenar();
    },
    { immediate: true },
  );
  // Si el registro cambia teniendo ya un valor (el proveedor se terminó de cargar), se descarta y se lee de nuevo.
  watch(registroId, () => {
    modelo.value = undefined;
  });
}

/**
 * Llena el `v-model` de una sección con lo guardado del registro (o con sus valores por omisión si es nuevo) y
 * lo vuelve a llenar si el registro cambia o el formulario lo vacía. Si la lectura falla, el valor queda sin
 * definir: así no se envía nada y no se pisa lo guardado; `reintentar` lo vuelve a pedir.
 */
export function usarLecturaDeSeccion<Valor>(modelo: Ref<Valor | undefined>, lectura: LecturaDeSeccion<Valor>) {
  const cargando = ref(false);
  const fallo = ref(false);
  async function llenar(): Promise<void> {
    const id = lectura.registroId();
    fallo.value = false;
    if (id === null) {
      modelo.value = lectura.porOmision();
      return;
    }
    cargando.value = true;
    try {
      modelo.value = (await leer(lectura, id, () => modelo.value === undefined)) ?? modelo.value;
    } catch {
      fallo.value = lectura.registroId() === id;
    } finally {
      cargando.value = false;
    }
  }

  vigilar(modelo, lectura.registroId, llenar);

  return { cargando, fallo, reintentar: llenar };
}
