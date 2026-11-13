import { describe, expect, it } from 'vitest';
import { MOTIVOS_SIN_CREDITO } from '../tipos-de-documento.js';
import { LEYENDA_DE_MOTIVOS, SIGLA_DEL_MOTIVO } from './motivos-del-libro.js';

describe('motivos del libro', () => {
  it('«otra causa» lleva la sigla OC y su leyenda', () => {
    expect(SIGLA_DEL_MOTIVO.otra_causa_sin_credito).toBe('OC');
    expect(LEYENDA_DE_MOTIVOS.find((l) => l.sigla === 'OC')?.descripcion).toMatch(/otra causa/);
  });

  it('todo motivo tiene sigla, y toda sigla su leyenda', () => {
    const leyendas = LEYENDA_DE_MOTIVOS.map((l) => l.sigla);

    for (const motivo of MOTIVOS_SIN_CREDITO) expect(leyendas).toContain(SIGLA_DEL_MOTIVO[motivo]);
  });
});
