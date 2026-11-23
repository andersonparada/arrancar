import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mediador } from '../modulos/core/mediador/contexto.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let recibidos: Array<{ aviso: string; empresaId: string; fechaDeInicio: string; operadorEmpresaId: string | null }>;
let falloAlReabrir: Error | null;

const base = () => `/api/empresas/${cuenta.empresaId}/carga-inicial`;
const cerrar = () => cuenta.propietario.post(`${base()}/cerrar`, {});
const reabrir = () => cuenta.propietario.post(`${base()}/reabrir`, { motivo: 'Corregir un saldo' });

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Avisos', usuario: 'propietarioavisos', modulos: ['terceros'] });
  mediador.escuchar('terceros', 'empresas.carga_por_cerrar', async (aviso, operador) => {
    recibidos.push({ aviso: 'cerrar', ...aviso, operadorEmpresaId: operador.empresaId });
  });
  mediador.escuchar('terceros', 'empresas.carga_por_reabrir', async (aviso, operador) => {
    if (falloAlReabrir) throw falloAlReabrir;
    recibidos.push({ aviso: 'reabrir', ...aviso, operadorEmpresaId: operador.empresaId });
  });
});

beforeEach(() => {
  recibidos = [];
  falloAlReabrir = null;
});

describe('avisos de la carga inicial', () => {
  it('cerrar y reabrir avisan a los módulos activos con la empresa y la fecha de inicio', async () => {
    await cuenta.propietario.put(base(), { fechaDeInicio: '2026-02-01' });
    expect((await cerrar()).estado).toBe(200);
    expect((await reabrir()).estado).toBe(200);

    const comun = { empresaId: cuenta.empresaId, fechaDeInicio: '2026-02-01', operadorEmpresaId: cuenta.empresaId };
    expect(recibidos).toEqual([
      { aviso: 'cerrar', ...comun },
      { aviso: 'reabrir', ...comun },
    ]);
  });

  it('si el que escucha rechaza la reapertura, la carga sigue cerrada', async () => {
    await cerrar();
    falloAlReabrir = new Error('período cerrado');

    expect((await reabrir()).estado).not.toBe(200);
    expect((await cuenta.propietario.get(base())).cuerpo.cerrada).toBe(true);
  });
});
