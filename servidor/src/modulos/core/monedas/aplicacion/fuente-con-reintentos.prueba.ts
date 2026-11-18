import { describe, expect, it } from 'vitest';
import { FuenteNoDisponible, RespuestaInvalida } from '../dominio/errores.js';
import { FuenteDeTiposDeCambioEnMemoria } from '../pruebas/fuente-de-tipos-de-cambio-en-memoria.js';
import { FuenteConReintentos } from './fuente-con-reintentos.js';

const HOY = '2026-11-18';

function armar() {
  const base = new FuenteDeTiposDeCambioEnMemoria();
  base.publicaciones.push({ moneda: 'USD', codigoBanguat: 2, fecha: HOY, referencia: '7.64489' });
  const esperas: number[] = [];
  const fuente = new FuenteConReintentos(base, {
    esperasMs: [10, 20],
    esperar: async (ms) => {
      esperas.push(ms);
    },
  });
  return { base, fuente, esperas };
}

describe('FuenteConReintentos', () => {
  it('sin fallos consulta una sola vez', async () => {
    const { base, fuente, esperas } = armar();
    const resultado = await fuente.tipoDelDia({ hoy: HOY });
    expect(resultado.publicaciones).toHaveLength(1);
    expect([base.consultas, esperas]).toEqual([1, []]);
  });

  it('reintenta con espera cuando la fuente no está disponible', async () => {
    const { base, fuente, esperas } = armar();
    base.fallosPendientes.push(new FuenteNoDisponible('x'), new FuenteNoDisponible('x'));
    const resultado = await fuente.tiposDelRango({ hoy: HOY, desde: HOY, hasta: HOY });
    expect(resultado.publicaciones).toHaveLength(1);
    expect([base.consultas, esperas]).toEqual([3, [10, 20]]);
  });

  it('reintenta también la lista de monedas y el rango de una moneda', async () => {
    const { base, fuente, esperas } = armar();
    base.monedasDelBanguat.push({ codigo: 28, descripcion: 'Euro' });
    base.publicaciones.push({ moneda: 'EUR', codigoBanguat: 28, fecha: HOY, referencia: '8.8' });
    base.fallosPendientes.push(new FuenteNoDisponible('x'), new FuenteNoDisponible('x'));
    expect(await fuente.monedasDisponibles()).toEqual([{ codigo: 28, descripcion: 'Euro' }]);
    base.fallosPendientes.push(new FuenteNoDisponible('x'));
    const resultado = await fuente.tiposDeLaMoneda({
      hoy: HOY,
      desde: HOY,
      hasta: HOY,
      moneda: 'EUR',
      codigoBanguat: 28,
    });
    expect(resultado.publicaciones).toHaveLength(1);
    expect([base.consultas, esperas]).toEqual([5, [10, 20, 10]]);
  });

  it('se rinde tras agotar los reintentos y lanza el último error', async () => {
    const { base, fuente } = armar();
    base.fallosPendientes.push(new FuenteNoDisponible('a'), new FuenteNoDisponible('b'), new FuenteNoDisponible('c'));
    await expect(fuente.tipoDelDia({ hoy: HOY })).rejects.toThrow('c');
    expect(base.consultas).toBe(3);
  });

  it('una respuesta inválida no se reintenta', async () => {
    const { base, fuente, esperas } = armar();
    base.fallosPendientes.push(new RespuestaInvalida('x'));
    await expect(fuente.tipoDelDia({ hoy: HOY })).rejects.toBeInstanceOf(RespuestaInvalida);
    expect([base.consultas, esperas]).toEqual([1, []]);
  });
});
