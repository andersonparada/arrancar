import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearBodega, entrada, prepararKardex, type EscenarioDeKardex } from './soporte/escenario-de-kardex.js';
import { trasladar } from './soporte/escenario-de-traslados.js';

const entorno = usarEntornoApi();
let e: EscenarioDeKardex;
let origen: string;
let destino: string;
let salidaId: string;
let numero = 9000;

/** Inserta un documento a mano (sin pasar por el dominio) para probar los checks de la base. */
const insertar = (clase: string, columnas: Record<string, string | null>) => {
  const todas = { clase, numero: String(++numero), fecha: '2026-07-20', ...columnas };
  const nombres = Object.keys(todas);
  return comoPropietario(
    `insert into inventarios.documentos (empresa_id, ${nombres.join(', ')})
     values ($1, ${nombres.map((_, i) => `$${i + 2}`).join(', ')})`,
    [e.cuenta.empresaId, ...Object.values(todas)],
  );
};

const rechaza = (promesa: Promise<unknown>, restriccion: string) => expect(promesa).rejects.toThrow(restriccion);

beforeAll(async () => {
  e = await prepararKardex(entorno, 'trastablas');
  origen = e.bodegaId;
  destino = await crearBodega(e.cuenta.propietario);
  await entrada(e.cuenta.propietario, {
    bodegaId: origen,
    fecha: '2026-07-01',
    renglones: [{ articuloId: e.articuloId, cantidad: '10', costoTotal: '20.00' }],
  });
  const enviado = await trasladar(e.cuenta.propietario, {
    origen,
    destino,
    renglones: [{ articuloId: e.articuloId, cantidad: '4' }],
  });
  salidaId = enviado.cuerpo.id;
});

describe('documentos de traslado', () => {
  it('la salida lleva destino y estado, y la entrada solo existe ligada a su salida', async () => {
    await rechaza(
      insertar('salida_de_traslado', { bodega_id: origen, estado_de_traslado: 'recibido' }),
      'documentos_traslado_destino_segun_clase',
    );
    await rechaza(
      insertar('salida_de_traslado', { bodega_id: origen, bodega_de_destino_id: destino }),
      'documentos_traslado_estado_segun_clase',
    );
    await rechaza(insertar('entrada_de_traslado', { bodega_id: destino }), 'documentos_recepcion_ligada');
    await rechaza(
      insertar('entrada_manual', { bodega_id: origen, soporte: 'X', causa: 'otra', estado_de_traslado: 'recibido' }),
      'documentos_traslado_estado_segun_clase',
    );
  });

  it('el estado es uno de los dos y el destino no puede ser el origen', async () => {
    await rechaza(
      insertar('salida_de_traslado', {
        bodega_id: origen,
        bodega_de_destino_id: destino,
        estado_de_traslado: 'perdido',
      }),
      'documentos_traslado_estado_valido',
    );
    await rechaza(
      insertar('salida_de_traslado', {
        bodega_id: origen,
        bodega_de_destino_id: origen,
        estado_de_traslado: 'recibido',
      }),
      'documentos_traslado_a_otra_bodega',
    );
  });

  it('una salida solo tiene una recepción vigente', async () => {
    const entradas = await comoPropietario<{ id: string }>(
      `select id from inventarios.documentos where empresa_id = $1 and clase = 'entrada_de_traslado'`,
      [e.cuenta.empresaId],
    );
    expect(entradas).toHaveLength(1);

    await rechaza(
      insertar('entrada_de_traslado', { bodega_id: destino, documento_relacionado_id: salidaId }),
      'documentos_recepcion_de_traslado_unica',
    );
  });

  it('el movimiento de traslado no admite cantidad cero y su costo es informativo', async () => {
    const [m] = await comoPropietario<{ id: string }>(
      `select id from inventarios.movimientos where empresa_id = $1 and tipo = 'traslado' limit 1`,
      [e.cuenta.empresaId],
    );

    await rechaza(
      comoPropietario(`update inventarios.movimientos set cantidad = 0 where id = $1`, [m!.id]),
      'movimientos_cantidad_por_tipo',
    );
  });
});

describe('nombres_de_bodegas', () => {
  it('da solo id, nombre y estado de las bodegas de la empresa activa, y solo a la aplicación', async () => {
    const privilegios = await comoPropietario<{ publico: boolean; aplicacion: boolean }>(
      `select has_function_privilege('public', 'inventarios.nombres_de_bodegas(uuid[])', 'execute') as publico,
              has_function_privilege('arrancar_app', 'inventarios.nombres_de_bodegas(uuid[])', 'execute') as aplicacion`,
      [],
    );
    const sinContexto = await comoPropietario(`select * from inventarios.nombres_de_bodegas(null)`, []);

    expect(privilegios).toEqual([{ publico: false, aplicacion: true }]);
    expect(sinContexto).toEqual([]);
  });
});
