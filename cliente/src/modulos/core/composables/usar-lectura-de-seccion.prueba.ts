import { nextTick, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { usarLecturaDeSeccion } from './usar-lectura-de-seccion';

const esperar = async (): Promise<void> => {
  await nextTick();
  await Promise.resolve();
  await nextTick();
};

function armar(traer: (id: string) => Promise<string>) {
  const registroId = ref<string | null>(null);
  const modelo = ref<string | undefined>(undefined);
  const lectura = usarLecturaDeSeccion(modelo, {
    registroId: () => registroId.value,
    traer,
    porOmision: () => 'omision',
  });
  return { registroId, modelo, lectura };
}

describe('usarLecturaDeSeccion', () => {
  it('un registro nuevo empieza con los valores por omisión, sin ir al servidor', () => {
    const traer = vi.fn();
    const { modelo } = armar(traer);
    expect(modelo.value).toBe('omision');
    expect(traer).not.toHaveBeenCalled();
  });

  it('un registro existente se llena con lo guardado', async () => {
    const { registroId, modelo } = armar(async (id) => `guardado de ${id}`);
    registroId.value = 'p1';
    await esperar();
    expect(modelo.value).toBe('guardado de p1');
  });

  it('si el formulario vacía el valor, se vuelve a llenar', async () => {
    const { registroId, modelo } = armar(async (id) => `guardado de ${id}`);
    registroId.value = 'p1';
    await esperar();
    modelo.value = undefined;
    await esperar();
    expect(modelo.value).toBe('guardado de p1');
  });

  it('si falla la lectura no inventa valores (así no se pisa lo guardado) y se puede reintentar', async () => {
    let falla = true;
    const { registroId, modelo, lectura } = armar(async () => {
      if (falla) throw new Error('sin conexión');
      return 'guardado';
    });
    registroId.value = 'p1';
    await esperar();
    expect(modelo.value).toBeUndefined();
    expect(lectura.fallo.value).toBe(true);
    falla = false;
    await lectura.reintentar();
    expect(modelo.value).toBe('guardado');
    expect(lectura.fallo.value).toBe(false);
  });
});
