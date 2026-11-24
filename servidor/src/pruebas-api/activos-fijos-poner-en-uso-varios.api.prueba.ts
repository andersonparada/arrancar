/**
 * «Disponible para uso» por lote (AFI-3): `POST /activos-fijos/activos/poner-en-uso` pone varios activos con una fecha
 * y una ubicación, todo o nada; la ubicación nace en la fila de alta o, si el activo ya tuvo traslados, en un traslado
 * con boleta; permisos y aislamiento entre cuentas.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { claseDe, crearUbicaciones, datosDeActivo } from './soporte/escenario-de-activos.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/activos-fijos/activos';
const TRASLADOS = '/api/activos-fijos/traslados';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let ajena: CuentaDePrueba;
let vehiculosId: string;
let localidadId: string;

/** Un activo en construcción con un costo manual; sin monto, queda sin costo. */
async function activoConCosto(monto: string | null = '1000.00') {
  const creado = await cuenta.propietario.post(RUTA, datosDeActivo(vehiculosId));
  expect(creado.estado, JSON.stringify(creado.cuerpo)).toBe(201);
  const id = creado.cuerpo.id as string;
  if (monto) {
    const costo = { claseDeCosto: 'adquisicion', fecha: '2026-11-05', monto, documentoDeSoporte: 'Factura 1' };
    expect((await cuenta.propietario.post(`${RUTA}/${id}/costos`, costo)).estado).toBe(201);
  }
  return id;
}

const lote = (ids: string[], cuerpo: Record<string, unknown> = {}) =>
  cuenta.propietario.post(`${RUTA}/poner-en-uso`, { activoIds: ids, fechaDeInicioDeUso: '2026-11-10', ...cuerpo });

const ficha = async (id: string) => (await cuenta.propietario.get(`${RUTA}/${id}`)).cuerpo;

beforeAll(async () => {
  const modulos = ['terceros', 'libro-de-compras', 'activos-fijos'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Lote de uso', usuario: 'propietariolote', modulos });
  ajena = await darDeAltaCuenta(entorno, { nombre: 'Lote ajena', usuario: 'propietariolotea', modulos });
  vehiculosId = await claseDe(cuenta, 'Vehículos');
  ({ localidadId } = await crearUbicaciones(cuenta));
});

describe('poner en uso varios', () => {
  it('pone en uso los tres con la misma fecha, sus dos tramos y la ubicación en la bodega', async () => {
    const ids = [await activoConCosto(), await activoConCosto(), await activoConCosto('2000.00')];

    const respuesta = await lote(ids, { ubicacion: { localidadId, departamentoId: null, responsable: null } });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo.map((a: { id: string }) => a.id)).toEqual(ids);
    for (const activo of respuesta.cuerpo)
      expect(activo).toMatchObject({
        estado: 'en_uso',
        fechaDeInicioDeUso: '2026-11-10',
        localidadId,
        enBodega: true,
        porcentajeFiscal: '20.00',
      });
    const tercero = await ficha(ids[2]!);
    expect(tercero.tramos).toHaveLength(2);
    expect(tercero.traslados).toHaveLength(1);
    expect(tercero.traslados[0]).toMatchObject({ esAlta: true, localidadNombre: 'Finca La Esperanza', aBodega: true });
  });

  it('con responsable no queda en la bodega, y los parámetros por activo se respetan', async () => {
    const ids = [await activoConCosto(), await activoConCosto()];

    const respuesta = await lote(ids, {
      ubicacion: { localidadId, departamentoId: null, responsable: 'Juan Pérez' },
      ajustes: [{ activoId: ids[1], porcentajeFiscal: '15.00', vidaUtilContableMeses: 48 }],
    });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo[0]).toMatchObject({
      responsable: 'Juan Pérez',
      enBodega: false,
      porcentajeFiscal: '20.00',
    });
    expect(respuesta.cuerpo[1]).toMatchObject({ porcentajeFiscal: '15.00', vidaUtilContableMeses: 48 });
  });

  it('es todo o nada: si uno no cumple, ninguno queda en uso ni cambia de ubicación', async () => {
    const bueno = await activoConCosto();
    const sinCosto = await activoConCosto(null);

    const respuesta = await lote([bueno, sinCosto], {
      ubicacion: { localidadId, departamentoId: null, responsable: null },
    });

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('activo_sin_costo');
    expect(await ficha(bueno)).toMatchObject({ estado: 'en_construccion', localidadId: null, tramos: [] });
  });

  it('rechaza activos repetidos, más de 200 o un lote vacío', async () => {
    const id = await activoConCosto();
    const muchos = Array.from({ length: 201 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`);

    const repetidos = await lote([id, id]);
    const exceso = await lote(muchos);
    const vacio = await lote([]);

    expect(repetidos.estado).toBe(400);
    expect(repetidos.cuerpo.error.codigo).toBe('poner_en_uso_varios_invalido');
    expect([exceso.estado, vacio.estado]).toEqual([400, 400]);
    expect((await ficha(id)).estado).toBe('en_construccion');
  });

  it('el activo que ya tuvo un traslado recibe otro, con boleta «Disponible para uso»', async () => {
    const trasladado = await activoConCosto();
    const nuevo = await activoConCosto();
    const entrega = {
      fecha: '2026-11-06',
      localidadId,
      departamentoId: null,
      responsable: 'Marta López',
      recibidoPor: 'Marta López',
      motivo: 'Armado en el taller',
      aBodega: false,
      marcarOcioso: false,
      renglones: [{ activoId: trasladado }],
    };
    expect((await cuenta.propietario.post(TRASLADOS, entrega)).estado).toBe(201);

    const respuesta = await lote([trasladado, nuevo], {
      ubicacion: { localidadId, departamentoId: null, responsable: null },
    });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    const despues = await ficha(trasladado);
    expect(despues).toMatchObject({ enBodega: true, responsable: null });
    expect(despues.traslados[0]).toMatchObject({ esAlta: false, motivo: 'Disponible para uso', aBodega: true });
    expect(despues.traslados).toHaveLength(3);
    expect((await ficha(nuevo)).traslados).toHaveLength(1);
  });

  it('exige el permiso de poner en uso y otra cuenta no ve los activos', async () => {
    const id = await activoConCosto();
    const edita = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Lote Edita',
      apellidos: 'Solo',
      permisos: ['activos-fijos.activos.editar'],
    });

    const sinPermiso = await edita.post(`${RUTA}/poner-en-uso`, { activoIds: [id], fechaDeInicioDeUso: '2026-11-10' });
    const deAjena = await ajena.propietario.post(`${RUTA}/poner-en-uso`, {
      activoIds: [id],
      fechaDeInicioDeUso: '2026-11-10',
    });

    expect(sinPermiso.estado).toBe(403);
    expect(deAjena.estado).toBe(404);
    expect((await ficha(id)).estado).toBe('en_construccion');
  });
});
