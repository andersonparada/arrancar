import { describe, expect, it } from 'vitest';
import { CorrelativosEnMemoria } from './dobles-compartidos.js';

describe('correlativos en memoria', () => {
  it('entrega consecutivos empezando en 1', async () => {
    const correlativos = new CorrelativosEnMemoria();

    const numeros = [
      await correlativos.siguiente('bancos.notas_de_credito', '2026-01-10'),
      await correlativos.siguiente('bancos.notas_de_credito', '2026-01-11'),
      await correlativos.siguiente('bancos.notas_de_credito', '2026-01-12'),
    ];

    expect(numeros).toEqual([
      { numero: 1, anio: 0 },
      { numero: 2, anio: 0 },
      { numero: 3, anio: 0 },
    ]);
  });

  it('lleva un contador por clave', async () => {
    const correlativos = new CorrelativosEnMemoria();
    await correlativos.siguiente('bancos.notas_de_credito', '2026-01-10');

    const debito = await correlativos.siguiente('bancos.notas_de_debito', '2026-01-10');

    expect(debito.numero).toBe(1);
  });

  it('por omisión no se reinicia al cambiar el año', async () => {
    const correlativos = new CorrelativosEnMemoria();
    await correlativos.siguiente('bancos.transferencias', '2026-12-31');

    const del2027 = await correlativos.siguiente('bancos.transferencias', '2027-01-01');

    expect(del2027).toEqual({ numero: 2, anio: 0 });
  });

  it('con reinicio anual, cada año empieza en 1 y guarda su año', async () => {
    const correlativos = new CorrelativosEnMemoria(true);
    await correlativos.siguiente('bancos.transferencias', '2026-12-31');

    const del2027 = await correlativos.siguiente('bancos.transferencias', '2027-01-01');
    const otraDel2026 = await correlativos.siguiente('bancos.transferencias', '2026-06-01');

    expect(del2027).toEqual({ numero: 1, anio: 2027 });
    expect(otraDel2026).toEqual({ numero: 2, anio: 2026 });
  });
});
