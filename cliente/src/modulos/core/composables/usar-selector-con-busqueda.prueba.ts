import { nextTick, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import type { OpcionBuscable } from '../utilidades/busqueda-de-opciones';
import { usarSelectorConBusqueda } from './usar-selector-con-busqueda';

describe('selector con opciones deshabilitadas', () => {
  const opciones = ref<OpcionBuscable<string>[]>([
    { valor: 'A', texto: 'A — Uno', grupo: 'Grupo' },
    { valor: 'B', texto: 'B — Dos (próximamente)', grupo: 'Grupo', deshabilitada: true },
  ]);

  it('elegir una opción deshabilitada no cambia nada ni cierra el selector', () => {
    const modelo = ref<string | undefined>('A');
    const selector = usarSelectorConBusqueda(opciones, modelo);
    selector.abrir();
    selector.elegir(opciones.value[1]!);
    expect(modelo.value).toBe('A');
    expect(selector.abierto.value).toBe(true);
  });

  it('una habilitada sí se elige', () => {
    const modelo = ref<string | undefined>('B');
    const selector = usarSelectorConBusqueda(opciones, modelo);
    selector.elegir(opciones.value[0]!);
    expect(modelo.value).toBe('A');
  });
});

describe('selector con búsqueda en el servidor', () => {
  const opciones = ref<OpcionBuscable<string>[]>([
    { valor: 'A', texto: 'Alfa' },
    { valor: 'B', texto: 'Beta' },
  ]);

  it('no filtra las opciones aquí y muestra el buscador aunque sean pocas', () => {
    const selector = usarSelectorConBusqueda(opciones, ref<string | undefined>(), ref(true));
    selector.abrir();
    selector.busqueda.value = 'zzz';
    expect(selector.opcionesFiltradas.value).toHaveLength(2);
    expect(selector.muestraBuscador.value).toBe(true);
  });
});

describe('reinicio de la opción resaltada al cambiar las opciones', () => {
  async function conOpcionesNuevas(enServidor: boolean) {
    const opciones = ref<OpcionBuscable<string>[]>([
      { valor: 'A', texto: 'Alfa' },
      { valor: 'B', texto: 'Beta' },
    ]);
    const selector = usarSelectorConBusqueda(opciones, ref<string | undefined>('B'), ref(enServidor));
    selector.abrir();
    selector.busqueda.value = 'a';
    opciones.value = [{ valor: 'C', texto: 'Gama' }];
    await nextTick();
    return selector;
  }

  it('sin búsqueda en el servidor el índice no se reinicia', async () => {
    expect((await conOpcionesNuevas(false)).indiceActivo.value).toBe(1);
  });

  it('con búsqueda en el servidor sí se reinicia', async () => {
    expect((await conOpcionesNuevas(true)).indiceActivo.value).toBe(-1);
  });
});
