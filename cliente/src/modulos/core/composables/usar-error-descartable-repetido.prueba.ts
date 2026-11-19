import { nextTick, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { usarErrorDescartable } from './usar-formulario';

/** Hallazgo de la QA de Multimoneda (2026-11-19): el mismo error de nuevo no vuelve a verse. */
describe('usarErrorDescartable: el mismo error en un segundo envío', () => {
  it.fails('vuelve a mostrarse si el usuario corrige a otro valor inválido y envía otra vez', async () => {
    const errores = ref<Record<string, string>>({});
    const valor = ref('0');
    const visible = usarErrorDescartable(
      () => errores.value['referencia'],
      () => valor.value,
    );
    errores.value = { referencia: 'Escriba un número mayor que cero.' };
    await nextTick();
    expect(visible.value).toBe('Escriba un número mayor que cero.');

    valor.value = '-1';
    await nextTick();
    expect(visible.value).toBeUndefined();

    // Segundo envío: la validación devuelve exactamente el mismo mensaje.
    errores.value = { referencia: 'Escriba un número mayor que cero.' };
    await nextTick();
    expect(visible.value).toBe('Escriba un número mayor que cero.');
  });
});
