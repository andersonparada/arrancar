import { readonly, ref, watch, type Ref } from 'vue';

const LLAVE = 'arrancar.menu.grupos-abiertos';

export type Almacen = Pick<Storage, 'getItem' | 'setItem'>;

/** El navegador puede negar el acceso (modo privado, datos bloqueados): entonces no se recuerda nada. */
function leer(almacen: Almacen | null): string[] {
  try {
    const guardado: unknown = JSON.parse(almacen?.getItem(LLAVE) ?? '[]');
    return Array.isArray(guardado) ? guardado.filter((clave) => typeof clave === 'string') : [];
  } catch {
    return [];
  }
}

function guardar(almacen: Almacen | null, abiertos: ReadonlySet<string>): void {
  try {
    almacen?.setItem(LLAVE, JSON.stringify([...abiertos]));
  } catch {
    // Sin almacenamiento el menú funciona igual; solo no se recuerda al volver.
  }
}

function almacenDelNavegador(): Almacen | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Qué grupos del menú están abiertos. Se abre solo el grupo de la página actual y
 * el navegador recuerda los que el usuario abrió o cerró.
 */
export function usarGruposAbiertos(grupoActual: Ref<string | null>, almacen = almacenDelNavegador()) {
  const abiertos = ref(new Set(leer(almacen)));

  function cambiar(clave: string, abrir: boolean): void {
    const siguientes = new Set(abiertos.value);
    if (abrir) siguientes.add(clave);
    else siguientes.delete(clave);
    abiertos.value = siguientes;
    guardar(almacen, siguientes);
  }

  watch(grupoActual, (clave) => clave && cambiar(clave, true), { immediate: true });

  return {
    abiertos: readonly(abiertos),
    alternar: (clave: string) => cambiar(clave, !abiertos.value.has(clave)),
  };
}
