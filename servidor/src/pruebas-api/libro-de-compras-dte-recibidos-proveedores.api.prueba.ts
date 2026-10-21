import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, nitValido } from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import {
  filaGuardada,
  prepararBandejaGeneral,
  RUTA_DTE,
  type BandejaGeneral,
  type CambiosDeLaFila,
} from './soporte/escenario-de-bandeja.js';

const entorno = usarEntornoApi();
const MARCA = 'Montos del resumen de la SAT (una sola línea).';
let bandeja: BandejaGeneral;

const propietario = (): ClienteApi => bandeja.escenario.cuenta.propietario;
const sembrar = (cambios: CambiosDeLaFila = {}) => bandeja.sembrar(cambios);

async function confirmar(ids: string[], cuerpo: Record<string, unknown> = {}, cliente = propietario()) {
  const respuesta = await cliente.post(`${RUTA_DTE}/confirmar`, { ids, ...cuerpo });
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return new Map<string, any>(respuesta.cuerpo.resultados.map((r: any) => [r.id, r]));
}

const proveedorDelDocumento = async (documentoId: string) =>
  (
    await consultar<{ proveedor_id: string }>('select proveedor_id from libro_de_compras.documentos where id = $1', [
      documentoId,
    ])
  )[0]!.proveedor_id;

beforeAll(async () => {
  bandeja = await prepararBandejaGeneral(entorno, {
    usuario: 'bandejaproveedores',
    nitDelProveedor: nitValido('4800001'),
  });
});

afterAll(() => vi.restoreAllMocks());

describe('proveedor nuevo', () => {
  const NIT_NUEVO = nitValido('4500010');

  it('se crea con su papel, con tipo de persona según el nombre, y se le pone a las demás filas pendientes del NIT', async () => {
    const [a, b] = [
      await sembrar({ nitEmisor: NIT_NUEVO, nombreEmisor: 'Distribuidora El Sol, S.A.' }),
      await sembrar({ nitEmisor: NIT_NUEVO, nombreEmisor: 'Distribuidora El Sol, S.A.' }),
    ];

    const resultado = (await confirmar([a])).get(a);

    const [tercero] = await consultar<{ tipo: string; razon_social: string }>(
      'select tipo, razon_social from terceros.terceros where nit = $1',
      [NIT_NUEVO],
    );
    expect(tercero).toEqual({ tipo: 'juridica', razon_social: 'Distribuidora El Sol, S.A.' });
    const papel = await consultar<{ id: string; activo: boolean }>(
      `select p.id, p.activo from terceros.proveedores p join terceros.terceros t on t.id = p.tercero_id where t.nit = $1`,
      [NIT_NUEVO],
    );
    expect(papel).toHaveLength(1);
    expect(await proveedorDelDocumento(resultado.documentoId)).toBe(papel[0]!.id);
    expect((await filaGuardada(b)).proveedor_id).toBe(papel[0]!.id);
  });

  it('un nombre sin forma de empresa se crea como persona individual', async () => {
    const nit = nitValido('4500011');
    const id = await sembrar({ nitEmisor: nit, nombreEmisor: 'Juan Pérez' });

    await confirmar([id]);

    const [tercero] = await consultar<{ tipo: string }>('select tipo from terceros.terceros where nit = $1', [nit]);
    expect(tercero!.tipo).toBe('individual');
  });

  it('sin el permiso proveedores.crear la fila falla y no se crea nada', async () => {
    const nit = nitValido('4500012');
    const id = await sembrar({ nitEmisor: nit });
    const registrador = await crearUsuarioConPermisos(entorno, bandeja.escenario.cuenta, {
      nombres: 'Registrador',
      apellidos: 'Bandeja',
      permisos: ['libro-de-compras.documentos.crear'],
    });

    const resultado = (await confirmar([id], {}, registrador)).get(id);

    expect(resultado.error.codigo).toBe('sin_permiso');
    expect(await consultar('select 1 from terceros.terceros where nit = $1', [nit])).toHaveLength(0);
    expect((await filaGuardada(id)).estado).toBe('pendiente');
  });
});

describe('vista previa', () => {
  it('calcula lo que registraría la confirmación sin guardar nada', async () => {
    const id = await sembrar({ iva: '108.00' });

    const respuesta = await propietario().post(`${RUTA_DTE}/vista-previa`, { ids: [id] });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo.resultados[0]).toMatchObject({
      id,
      documento: { totales: { total: '1120.00', iva: '108.00', exento: '112.00' } },
    });
    expect(respuesta.cuerpo.resultados[0].avisos).toContain(MARCA);
    expect((await filaGuardada(id)).estado).toBe('pendiente');
  });

  it('sin proveedor todavía responde su error, y las demás filas siguen', async () => {
    const nuevo = await sembrar({ nitEmisor: nitValido('4500013') });
    const conocido = await sembrar();

    const respuesta = await propietario().post(`${RUTA_DTE}/vista-previa`, { ids: [nuevo, conocido] });

    expect(respuesta.cuerpo.resultados[0].error.codigo).toBe('dte_sin_proveedor');
    expect(respuesta.cuerpo.resultados[1].documento.totales.total).toBe('1120.00');
  });
});
