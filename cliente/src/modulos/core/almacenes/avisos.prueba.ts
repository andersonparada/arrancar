import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { usarAvisos } from './avisos';

beforeEach(() => setActivePinia(createPinia()));

describe('avisos emergentes', () => {
  it('un aviso de éxito retira los errores que siguen a la vista', () => {
    const avisos = usarAvisos();
    avisos.error('No se pudo.');
    avisos.info('Ojo.');

    avisos.exito('Listo.');

    expect(avisos.avisos.map((aviso) => aviso.tipo)).toEqual(['info', 'exito']);
  });

  it('un error no retira los demás avisos', () => {
    const avisos = usarAvisos();
    avisos.exito('Listo.');
    avisos.error('No se pudo.');

    expect(avisos.avisos).toHaveLength(2);
  });
});
