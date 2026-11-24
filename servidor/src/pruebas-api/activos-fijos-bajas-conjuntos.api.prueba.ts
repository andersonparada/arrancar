/**
 * Bajas con componentes y con el cierre (AF-9): el cierre toma lo que la baja congeló aunque la regla del primer mes
 * cambie, una baja no precede a una mejora, un componente no vuelve a uso con su principal dado de baja, la venta de un
 * conjunto con bienes sin libros y el acta del principal como acta de todo el acto.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { claseDe, datosDeActivo } from './soporte/escenario-de-activos.js';
import { activoEnUsoDe, baja, venta } from './soporte/escenario-de-bajas-de-activos.js';
import { instalarDestinoFalso } from './soporte/escenario-de-documentos.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { crearImagenPng } from './soporte/imagenes.js';

const BAJAS = '/api/activos-fijos/bajas';
const ACTIVOS = '/api/activos-fijos/activos';
const MEJORAS = '/api/activos-fijos/mejoras';
const DEPRECIACION = '/api/activos-fijos/depreciacion';
const PRIMER_MES = 'activos-fijos.depreciacion.primer_mes';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let vehiculosId: string;
let contador = 0;

const activoEnUso = (monto?: string, cambios?: Record<string, unknown>) =>
  activoEnUsoDe(cuenta, vehiculosId, { monto, cambios });

const bajaDe = (activoId: string) =>
  comoPropietario<{ id: string }>('select id from activos_fijos.bajas where activo_id = $1', [activoId]).then(
    (filas) => filas[0]!.id,
  );

async function fijarPrimerMes(regla: 'mes_de_inicio' | 'mes_siguiente') {
  await entorno.soporte.put('/api/sesion/empresa-activa', { empresaId: cuenta.empresaId });
  const respuesta = await entorno.soporte.put(`/api/configuracion/${PRIMER_MES}`, { nivel: 'empresa', valor: regla });
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(204);
}

async function cerrar(periodo: string) {
  const { cuerpo: revision } = await cuenta.propietario.get(`${DEPRECIACION}/${periodo}/revision`);
  const cierre = await cuenta.propietario.post(`${DEPRECIACION}/${periodo}/cerrar`, { huella: revision.huella });
  expect(cierre.estado, JSON.stringify(cierre.cuerpo)).toBe(200);
}

const periodosDeCuotas = async (activoId: string) =>
  (
    await comoPropietario<{ periodo: string }>(
      "select periodo::text from activos_fijos.cuotas where activo_id = $1 and libro = 'contable' and vigente order by periodo",
      [activoId],
    )
  ).map((fila) => fila.periodo);

async function nuevaCuenta(): Promise<void> {
  contador += 1;
  const modulos = ['terceros', 'libro-de-compras', 'activos-fijos'];
  const usuario = `propietariobajasconjuntos${'abcdefghijkl'[contador]}`;
  cuenta = await darDeAltaCuenta(entorno, { nombre: `Bajas conjuntos ${contador}`, usuario, modulos });
  vehiculosId = await claseDe(cuenta, 'Vehículos');
}

beforeAll(() => instalarDestinoFalso());
afterAll(() => vi.restoreAllMocks());

describe('el cierre sigue lo que la baja congeló y no la regla de hoy', () => {
  it.each([
    ['mes_siguiente', 'mes_de_inicio', ['2026-09-01', '2026-10-01']],
    ['mes_de_inicio', 'mes_siguiente', ['2026-09-01']],
  ] as const)(
    'baja con «%s» y cierre con «%s»: el activo recibe las cuotas %j',
    async (alDarDeBaja, alCerrar, esperadas) => {
      await nuevaCuenta();
      const id = await activoEnUso();
      await fijarPrimerMes(alDarDeBaja);
      const creada = (await cuenta.propietario.post(BAJAS, baja(id, { fecha: '2026-10-20' }))).cuerpo;
      await fijarPrimerMes(alCerrar);

      await cerrar('2026-09-01');
      await cerrar('2026-10-01');

      expect(await periodosDeCuotas(id)).toEqual(esperadas);
      const suma = await comoPropietario<{ total: string }>(
        "select sum(monto)::text as total from activos_fijos.cuotas where activo_id = $1 and libro = 'contable' and vigente",
        [id],
      );
      expect(Number(suma[0]!.total).toFixed(2)).toBe(Number(creada.depreciacionAcumuladaContable).toFixed(2));
    },
  );
});

describe('una baja no precede a una mejora', () => {
  it('se rechaza la baja con fecha anterior a una mejora vigente y se acepta desde su fecha', async () => {
    await nuevaCuenta();
    const id = await activoEnUso();
    const mejora = await cuenta.propietario.post(MEJORAS, {
      activoId: id,
      clase: 'mejora',
      fecha: '2026-10-15',
      descripcion: 'Motor nuevo',
      lineas: [],
      costosManuales: [{ claseDeCosto: 'otro', monto: '50000.00', documentoDeSoporte: 'Factura 55' }],
    });
    expect(mejora.estado, JSON.stringify(mejora.cuerpo)).toBe(201);

    const antes = await cuenta.propietario.post(BAJAS, baja(id, { fecha: '2026-09-30' }));
    const desde = await cuenta.propietario.post(BAJAS, baja(id, { fecha: '2026-10-15' }));

    expect([antes.estado, antes.cuerpo.error.codigo]).toEqual([422, 'baja_anterior_a_una_mejora']);
    expect(desde.estado, JSON.stringify(desde.cuerpo)).toBe(201);
    expect(desde.cuerpo.costo).toBe('300000.00');
  });
});

describe('componentes dados de baja en otra acta que su principal', () => {
  it('la baja del componente no se anula mientras su principal siga dado de baja', async () => {
    await nuevaCuenta();
    const principal = await activoEnUso('75000.00');
    const hijo = await activoEnUso('25000.00', { activoPadreId: principal });
    const delHijo = await cuenta.propietario.post(BAJAS, baja(hijo));
    await cuenta.propietario.post(BAJAS, baja(principal));

    const rechazada = await cuenta.propietario.post(`${BAJAS}/${delHijo.cuerpo.id}/anular`, { motivo: 'Error' });

    expect([rechazada.estado, rechazada.cuerpo.error.codigo]).toEqual([
      422,
      'baja_de_componente_con_principal_dado_de_baja',
    ]);
    expect((await cuenta.propietario.get(`${ACTIVOS}/${hijo}`)).cuerpo.estado).toBe('dado_de_baja');
    await cuenta.propietario.post(`${BAJAS}/${await bajaDe(principal)}/anular`, { motivo: 'Error' });
    const ahora = await cuenta.propietario.post(`${BAJAS}/${delHijo.cuerpo.id}/anular`, { motivo: 'Error' });
    expect(ahora.estado, JSON.stringify(ahora.cuerpo)).toBe(200);
  });
});

describe('vender un principal con un bien de control', () => {
  it('el bien de control se va con el principal sin precio propio y el principal se queda con la venta', async () => {
    await nuevaCuenta();
    const principal = await activoEnUso('75000.00');
    const control = await cuenta.propietario.post(
      ACTIVOS,
      datosDeActivo(vehiculosId, { tipoDeRegistro: 'bien_de_control', activoPadreId: principal }),
    );
    expect(control.estado, JSON.stringify(control.cuerpo)).toBe(201);

    const respuesta = await cuenta.propietario.post(BAJAS, venta(principal));

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo.precio).toBe('100000.00');
    const filas = await comoPropietario<{ causa: string; precio: string | null }>(
      'select causa, precio from activos_fijos.bajas where activo_id = $1',
      [control.cuerpo.id],
    );
    expect(filas).toEqual([{ causa: 'otra', precio: null }]);
  });
});

describe('lo que no se vende', () => {
  it('un bien de control no se vende como activo y no queda baja', async () => {
    await nuevaCuenta();
    const control = await cuenta.propietario.post(
      ACTIVOS,
      datosDeActivo(vehiculosId, { tipoDeRegistro: 'bien_de_control' }),
    );

    const respuesta = await cuenta.propietario.post(BAJAS, venta(control.cuerpo.id));

    expect([respuesta.estado, respuesta.cuerpo.error.codigo]).toEqual([422, 'causa_de_baja_no_permitida']);
  });
});

describe('bienes de terceros', () => {
  const deTerceros = {
    tipoDeRegistro: 'de_terceros',
    origen: null,
    propietario: 'Vecino',
    formaDeTenencia: 'comodato',
  };

  it('un bien de terceros solo se puede dar por faltante de inventario, sin volverse «devuelto»', async () => {
    await nuevaCuenta();
    const creado = await cuenta.propietario.post(ACTIVOS, datosDeActivo(vehiculosId, deTerceros));

    const respuesta = await cuenta.propietario.post(BAJAS, baja(creado.cuerpo.id, { causa: 'faltante_de_inventario' }));

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo.causa).toBe('faltante_de_inventario');
    expect(respuesta.cuerpo.avisos.map((x: { codigo: string }) => x.codigo)).toContain(
      'posible_responsabilidad_ante_el_dueno',
    );
  });

  it('un componente de terceros pide confirmación y no hereda la causa en silencio', async () => {
    await nuevaCuenta();
    const principal = await activoEnUso('75000.00');
    const hijo = await cuenta.propietario.post(
      ACTIVOS,
      datosDeActivo(vehiculosId, { ...deTerceros, activoPadreId: principal }),
    );
    const codigo = hijo.cuerpo.codigo as string;

    const sinConfirmar = await cuenta.propietario.post(BAJAS, baja(principal, { causa: 'faltante_de_inventario' }));
    const confirmada = await cuenta.propietario.post(
      BAJAS,
      baja(principal, { causa: 'faltante_de_inventario', tercerosConfirmados: [codigo] }),
    );

    expect([sinConfirmar.estado, sinConfirmar.cuerpo.error.codigo]).toEqual([422, 'bien_de_terceros_sin_confirmar']);
    expect(confirmada.estado, JSON.stringify(confirmada.cuerpo)).toBe(201);
    const filas = await comoPropietario<{ causa: string }>(
      'select causa from activos_fijos.bajas where activo_id = $1',
      [hijo.cuerpo.id],
    );
    expect(filas).toEqual([{ causa: 'faltante_de_inventario' }]);
  });
});

describe('el acta del principal es la de todo el acto', () => {
  it('el componente la ve como suya: avisos, indicador y descarga', async () => {
    await nuevaCuenta();
    const principal = await activoEnUso('75000.00');
    const hijo = await activoEnUso('25000.00', { activoPadreId: principal });
    const creada = (await cuenta.propietario.post(BAJAS, baja(principal))).cuerpo;
    const delHijo = await bajaDe(hijo);
    expect(
      (await cuenta.propietario.get(`${BAJAS}/${delHijo}`)).cuerpo.avisos.map((a: { codigo: string }) => a.codigo),
    ).toContain('sin_acta');

    const subida = await cuenta.propietario.subirImagen(
      'POST',
      `${BAJAS}/${creada.id}/acta?tipoDeActa=administrativa`,
      await crearImagenPng(80, 60),
    );

    expect(subida.estado, JSON.stringify(subida.cuerpo)).toBe(200);
    const delComponente = (await cuenta.propietario.get(`${BAJAS}/${delHijo}`)).cuerpo;
    expect(delComponente).toMatchObject({ tieneActa: true, tipoDeActa: 'administrativa' });
    expect(delComponente.avisos.map((a: { codigo: string }) => a.codigo)).not.toContain('sin_acta');
    expect((await cuenta.propietario.get(`${BAJAS}/${delHijo}/acta`)).estado).toBe(200);
  });
});
