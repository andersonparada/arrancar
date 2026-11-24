/**
 * El cierre mensual del inventario (INV-8): orden de los meses, la foto de las existencias valuadas con su renglón «En
 * tránsito interno», los candados del mes cerrado, la huella de la revisión y la reapertura.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cuadreDelKardex } from './soporte/cuadre-del-kardex.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  auditoriaDeCierres,
  centavosDe,
  CIERRES,
  cerrarMes,
  filasDeFoto,
  fotoDelMes,
  reabrirMes,
  renglonesDeFoto,
  revisarMes,
} from './soporte/escenario-de-cierres.js';
import {
  crearArticulo,
  crearBodega,
  entrada,
  prepararKardex,
  type EscenarioDeKardex,
} from './soporte/escenario-de-kardex.js';
import { fijarTransito, recibir, trasladar } from './soporte/escenario-de-traslados.js';

const entorno = usarEntornoApi();
let e: EscenarioDeKardex;
let bodega1: string;
let bodega2: string;
let suministro: string;
let traslado: string;
let entradaDeJulio: string;

const propietario = () => e.cuenta.propietario;
const codigo = async (respuesta: Promise<{ cuerpo: any }>) => (await respuesta).cuerpo.error?.codigo;

beforeAll(async () => {
  e = await prepararKardex(entorno, 'cierresflujo');
  await fijarTransito(entorno, e, true);
  [bodega1, bodega2] = [e.bodegaId, await crearBodega(propietario())];
  suministro = await crearArticulo(propietario(), e.referencias, { tipoDeInventario: 'suministros' });
  const compra = (datos: {
    fecha: string;
    cantidad: string;
    costoTotal: string;
    articuloId?: string;
    bodegaId?: string;
  }) =>
    entrada(propietario(), {
      bodegaId: datos.bodegaId ?? bodega1,
      fecha: datos.fecha,
      renglones: [
        { articuloId: datos.articuloId ?? e.articuloId, cantidad: datos.cantidad, costoTotal: datos.costoTotal },
      ],
    });
  entradaDeJulio = (await compra({ fecha: '2026-07-01', cantidad: '100', costoTotal: '200.00' })).cuerpo.id;
  await compra({ fecha: '2026-07-02', cantidad: '50', costoTotal: '115.00' });
  await compra({ fecha: '2026-07-03', cantidad: '10', costoTotal: '50.00', articuloId: suministro, bodegaId: bodega2 });
  const enviado = await trasladar(propietario(), {
    origen: bodega1,
    destino: bodega2,
    fecha: '2026-07-10',
    renglones: [{ articuloId: e.articuloId, cantidad: '20' }],
  });
  expect(enviado.cuerpo.estadoDeTraslado).toBe('en_transito');
  traslado = enviado.cuerpo.id;
});

afterAll(async () => {
  expect(await cuadreDelKardex(e.cuenta.empresaId)).toEqual([]);
});

describe('el orden de los cierres', () => {
  it('el primer mes por cerrar es el del primer movimiento', async () => {
    const lista = await propietario().get(CIERRES);

    expect(lista.cuerpo).toEqual({ siguienteMes: '2026-07-01', cierres: [] });
  });

  it('agosto no se revisa ni se cierra mientras julio siga abierto', async () => {
    const revision = (await revisarMes(propietario(), '2026-08-01')).cuerpo;

    expect(revision.puedeCerrar).toBe(false);
    expect(revision.hallazgos.map((h: { codigo: string }) => h.codigo)).toEqual(['mes_anterior_sin_cerrar']);
    expect(await codigo(cerrarMes(propietario(), '2026-08-01'))).toBe('mes_anterior_sin_cerrar');
  });

  it('un mes posterior al mes en curso no se puede cerrar', async () => {
    expect(await codigo(cerrarMes(propietario(), '2099-01-01'))).toBe('mes_por_llegar');
  });
});

describe('cerrar julio', () => {
  it('la revisión da las cifras, avisa del traslado en tránsito y trae la huella', async () => {
    const respuesta = await revisarMes(propietario(), '2026-07-01');

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({
      periodo: '2026-07-01',
      puedeCerrar: true,
      metodo: 'promedio_ponderado',
      totales: {
        valorTotal: '365.00',
        articulosConExistencia: 2,
        porTipo: [
          { tipoDeInventario: 'mercaderia', valor: '315.00' },
          { tipoDeInventario: 'suministros', valor: '50.00' },
        ],
      },
    });
    expect(respuesta.cuerpo.huella).toHaveLength(64);
    expect(respuesta.cuerpo.hallazgos).toEqual([
      expect.objectContaining({ nivel: 'aviso', codigo: 'traslados_en_transito', cantidad: 1 }),
    ]);
  });

  it('guarda la foto: cada bodega al costo del artículo y lo que viaja en su renglón «En tránsito interno»', async () => {
    const respuesta = await cerrarMes(propietario(), '2026-07-01');

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({ estado: 'cerrado', valorTotal: '365.00', articulosConExistencia: 2 });
    const foto = await renglonesDeFoto(propietario(), '2026-07-01');
    const delArticulo = foto.filter((r) => r.articuloId === e.articuloId);
    expect(delArticulo).toHaveLength(2);
    expect(delArticulo.find((r) => !r.enTransitoInterno)).toMatchObject({
      bodegaId: bodega1,
      cantidad: '130.0000',
      costoUnitario: '2.100000',
      valor: '273.00',
    });
    expect(delArticulo.find((r) => r.enTransitoInterno)).toMatchObject({
      bodegaId: bodega1,
      cantidad: '20.0000',
      valor: '42.00',
    });
    expect(foto.find((r) => r.articuloId === suministro)).toMatchObject({ bodegaId: bodega2, valor: '50.00' });
    expect(centavosDe(foto)).toBe(36_500);
  });

  it('cerrar de nuevo un mes cerrado se rechaza', async () => {
    expect(await codigo(cerrarMes(propietario(), '2026-07-01'))).toBe('mes_cerrado');
  });

  it('el mes cerrado no admite documentos nuevos ni anular los que tiene', async () => {
    const nuevo = await entrada(propietario(), {
      bodegaId: bodega1,
      fecha: '2026-07-20',
      renglones: [{ articuloId: e.articuloId, cantidad: '1', costoTotal: '2.00' }],
    });
    const traslado = await trasladar(propietario(), {
      origen: bodega1,
      destino: bodega2,
      fecha: '2026-07-21',
      renglones: [{ articuloId: e.articuloId, cantidad: '1' }],
    });
    const anulada = await propietario().post(`/api/inventarios/entradas/${entradaDeJulio}/anular`, { motivo: 'Error' });

    expect([nuevo.cuerpo.error.codigo, traslado.cuerpo.error.codigo, anulada.cuerpo.error.codigo]).toEqual([
      'mes_cerrado',
      'mes_cerrado',
      'mes_cerrado',
    ]);
  });

  it('una fecha anterior al primer mes cerrado también se rechaza: no hay meses abiertos antes del cierre', async () => {
    const antes = await renglonesDeFoto(propietario(), '2026-07-01');

    const nuevo = await entrada(propietario(), {
      bodegaId: bodega1,
      fecha: '2026-06-15',
      renglones: [{ articuloId: e.articuloId, cantidad: '40', costoTotal: '400.00' }],
    });

    expect(nuevo.cuerpo.error.codigo).toBe('mes_cerrado');
    expect(await renglonesDeFoto(propietario(), '2026-07-01')).toEqual(antes);
  });
});

describe('agosto y septiembre', () => {
  it('recibir el traslado en agosto no cambia la foto de julio, que sigue con su renglón en tránsito', async () => {
    const antes = await renglonesDeFoto(propietario(), '2026-07-01');

    const recibido = await recibir(propietario(), traslado, { fecha: '2026-08-05' });

    expect(recibido.estado, JSON.stringify(recibido.cuerpo)).toBe(200);
    expect(await renglonesDeFoto(propietario(), '2026-07-01')).toEqual(antes);
  });

  it('agosto cierra sin tránsito: lo recibido ya está en la bodega de destino y el valor no cambió', async () => {
    const revision = (await revisarMes(propietario(), '2026-08-01')).cuerpo;
    expect(revision.hallazgos).toEqual([]);

    expect((await cerrarMes(propietario(), '2026-08-01')).estado).toBe(200);

    const foto = (await renglonesDeFoto(propietario(), '2026-08-01')).filter((r) => r.articuloId === e.articuloId);
    expect(foto.some((r) => r.enTransitoInterno)).toBe(false);
    expect(foto.map((r) => [r.bodegaId, r.cantidad, r.valor]).sort()).toEqual(
      [
        [bodega1, '130.0000', '273.00'],
        [bodega2, '20.0000', '42.00'],
      ].sort(),
    );
  });

  it('si algo cambia entre revisar y cerrar, la huella vieja se rechaza y la nueva sirve', async () => {
    const revisada = (await revisarMes(propietario(), '2026-09-01')).cuerpo;
    await entrada(propietario(), {
      bodegaId: bodega1,
      fecha: '2026-09-10',
      renglones: [{ articuloId: e.articuloId, cantidad: '5', costoTotal: '10.00' }],
    });

    const rechazada = await cerrarMes(propietario(), '2026-09-01', { huella: revisada.huella });

    expect(rechazada.cuerpo.error.codigo).toBe('revision_del_cierre_desactualizada');
    const nueva = rechazada.cuerpo.error.detalles;
    expect(nueva.totales.valorTotal).toBe('375.00');
    expect((await cerrarMes(propietario(), '2026-09-01', { huella: nueva.huella })).estado).toBe(200);
    expect(centavosDe(await renglonesDeFoto(propietario(), '2026-09-01'))).toBe(37_500);
  });
});

describe('reabrir', () => {
  it('solo se reabre el último mes cerrado, y con motivo', async () => {
    expect(await codigo(reabrirMes(propietario(), '2026-07-01'))).toBe('solo_se_reabre_el_ultimo');
    expect((await propietario().post(`${CIERRES}/2026-09-01/reabrir`, { motivo: '  ' })).estado).toBe(400);
  });

  it('la foto del mes reabierto deja de valer, el mes admite documentos y la auditoría guarda lo que había', async () => {
    const reabierto = await reabrirMes(propietario(), '2026-09-01');

    expect(reabierto.estado, JSON.stringify(reabierto.cuerpo)).toBe(200);
    expect(reabierto.cuerpo).toMatchObject({ estado: 'reabierto', motivoDeReapertura: 'Faltó registrar una compra' });
    expect((await fotoDelMes(propietario(), '2026-09-01')).estado).toBe(404);
    expect(await filasDeFoto(e.cuenta.empresaId, '2026-09-01', true)).toBe(0);
    expect(await filasDeFoto(e.cuenta.empresaId, '2026-09-01', false)).toBeGreaterThan(0);
    const [rastro] = await auditoriaDeCierres(e.cuenta.empresaId, 'reabrir');
    expect(rastro).toMatchObject({ motivo: 'Faltó registrar una compra' });
    expect(rastro!.anterior).toMatchObject({ valorTotal: '375.00', porTipo: expect.any(Array) });
    expect((await propietario().get(CIERRES)).cuerpo.siguienteMes).toBe('2026-09-01');
  });

  it('al cerrar otra vez el mes, la foto nueva es la vigente y la vieja se conserva', async () => {
    const viejas = await filasDeFoto(e.cuenta.empresaId, '2026-09-01', false);
    const compra = await entrada(propietario(), {
      bodegaId: bodega2,
      fecha: '2026-09-15',
      renglones: [{ articuloId: suministro, cantidad: '4', costoTotal: '20.00' }],
    });
    expect(compra.estado).toBe(201);

    expect((await cerrarMes(propietario(), '2026-09-01')).estado).toBe(200);

    expect(centavosDe(await renglonesDeFoto(propietario(), '2026-09-01'))).toBe(39_500);
    expect(await filasDeFoto(e.cuenta.empresaId, '2026-09-01', false)).toBe(viejas);
    expect(await auditoriaDeCierres(e.cuenta.empresaId, 'cerrar')).toHaveLength(4);
    expect((await propietario().get(CIERRES)).cuerpo.cierres.map((c: { periodo: string }) => c.periodo)).toEqual([
      '2026-09-01',
      '2026-08-01',
      '2026-07-01',
    ]);
  });
});
