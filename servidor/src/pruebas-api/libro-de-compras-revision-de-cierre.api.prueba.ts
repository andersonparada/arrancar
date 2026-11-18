import { beforeAll, describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let conLibro: CuentaDePrueba;
let sinLibro: CuentaDePrueba;

const ruta = (cuenta: CuentaDePrueba, parte: string) => `/api/empresas/${cuenta.empresaId}/carga-inicial/${parte}`;

async function modulosDeLaRevision(cuenta: CuentaDePrueba, fechaDeInicio: string): Promise<string[]> {
  await cuenta.propietario.put(`/api/empresas/${cuenta.empresaId}/carga-inicial`, { fechaDeInicio });
  const { cuerpo } = await cuenta.propietario.get(ruta(cuenta, 'revision-de-cierre'));
  return cuerpo.modulos.map((modulo: { nombreDelModulo: string }) => modulo.nombreDelModulo);
}

beforeAll(async () => {
  conLibro = await darDeAltaCuenta(entorno, {
    nombre: 'Con libro',
    usuario: 'propietarioconlibrocierre',
    modulos: ['terceros', 'libro-de-compras'],
  });
  sinLibro = await darDeAltaCuenta(entorno, { nombre: 'Sin libro', usuario: 'propietariosinlibrocierre' });
});

describe('revisión del cierre: Libro de compras', () => {
  it('con el módulo activo y una fecha que no es día 1 avisa del mes partido', async () => {
    const modulos = await modulosDeLaRevision(conLibro, '2026-03-15');
    const { cuerpo } = await conLibro.propietario.get(ruta(conLibro, 'revision-de-cierre'));

    expect(modulos).toEqual(['Empresa', 'Libro de compras']);
    expect(cuerpo.modulos[1].hallazgos).toEqual([
      expect.objectContaining({ codigo: 'mes_partido', nivel: 'aviso', mensaje: expect.stringContaining('03/2026') }),
    ]);
    expect(cuerpo.pideMotivo).toBe(false);
  });

  it('con el módulo activo y día 1 no responde', async () => {
    expect(await modulosDeLaRevision(conLibro, '2026-01-01')).toEqual(['Empresa']);
  });

  it('con el módulo apagado no responde, aunque la fecha no sea día 1', async () => {
    expect(await modulosDeLaRevision(sinLibro, '2026-03-15')).toEqual(['Empresa']);
  });
});
