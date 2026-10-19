import { ref } from 'vue';
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
