/**
 * Venta de un bien de control (AF-9b): el resultado con valor en libros cero, el costo fiscal según la contabilidad
 * completa y el costo documentado, y el costo que escribe el contador con su permiso y su rastro en la auditoría.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { claseDe, datosDeActivo } from './soporte/escenario-de-activos.js';
import { venta } from './soporte/escenario-de-bajas-de-activos.js';
import { configurarEmpresa, instalarDestinoFalso } from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const BAJAS = '/api/activos-fijos/bajas';
const ACTIVOS = '/api/activos-fijos/activos';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let herramientasId: string;

const DEL_CONTADOR = { monto: '800.00', motivo: 'Factura 123 de Ferretería López' };

/** Un bien de control con un costo de referencia documentado de Q800.00 (o sin costo). */
async function bienDeControl(monto: string | null = '800.00'): Promise<string> {
  const creado = await cuenta.propietario.post(
    ACTIVOS,
    datosDeActivo(herramientasId, { tipoDeRegistro: 'bien_de_control', fechaDeAdquisicion: '2026-09-01' }),
  );
  expect(creado.estado, JSON.stringify(creado.cuerpo)).toBe(201);
  if (monto) {
    const costo = await cuenta.propietario.post(`${ACTIVOS}/${creado.cuerpo.id}/costos`, {
      claseDeCosto: 'adquisicion',
      fecha: '2026-09-05',
      monto,
      documentoDeSoporte: 'Factura 55',
    });
    expect(costo.estado, JSON.stringify(costo.cuerpo)).toBe(201);
  }
  return creado.cuerpo.id as string;
}

const auditoria = (registroId: string) =>
  comoPropietario<{ anterior: Record<string, unknown>; motivo: string | null }>(
    "select anterior, motivo from core.auditoria where recurso = 'activos-fijos.bajas' and accion = 'corregir' and registro_id = $1",
    [registroId],
  );

beforeAll(async () => {
  instalarDestinoFalso();
  const modulos = ['terceros', 'libro-de-compras', 'activos-fijos'];
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Venta de control',
    usuario: 'propietarioventadecontrol',
    modulos,
  });
  herramientasId = await claseDe(cuenta, 'Herramientas');
});

afterAll(() => vi.restoreAllMocks());

describe('vender un bien de control', () => {
  it('la sociedad lo vende con valor en libros cero y todo el precio como resultado', async () => {
    const id = await bienDeControl();

    const respuesta = await cuenta.propietario.post(BAJAS, venta(id));

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo).toMatchObject({
      costo: '0.00',
      valorEnLibros: '0.00',
      costoFiscal: '0.00',
      resultadoContable: '100000.00',
      resultadoFiscal: '100000.00',
      origenDelCostoFiscal: 'en_libros',
    });
    const filas = await comoPropietario<{ origen: string }>(
      'select origen_del_costo_fiscal as origen from activos_fijos.bajas where activo_id = $1',
      [id],
    );
    expect(filas).toEqual([{ origen: 'en_libros' }]);
  });

  it('quien no lleva contabilidad completa sostiene el costo documentado y se lee en la ficha', async () => {
    await configurarEmpresa(cuenta, {
      tipoDePersona: 'individual',
      regimenIva: 'general',
      regimenIsr: 'opcional_simplificado',
      agenteDeRetencionIva: 'ninguno',
      esAgenteDeRetencionIsr: false,
    });
    const id = await bienDeControl();

    const creada = await cuenta.propietario.post(BAJAS, venta(id));
    const leida = await cuenta.propietario.get(`${BAJAS}/${creada.cuerpo.id}`);

    expect(creada.estado, JSON.stringify(creada.cuerpo)).toBe(201);
    expect(leida.cuerpo).toMatchObject({
      costoFiscal: '800.00',
      resultadoFiscal: '99200.00',
      origenDelCostoFiscal: 'documentado',
    });
    expect(leida.cuerpo.avisos.map((aviso: { codigo: string }) => aviso.codigo)).toContain('isr_de_venta_de_control');
  });
});

describe('el costo fiscal que escribe el contador', () => {
  it('sin su permiso se rechaza con 403 y no queda baja; con él queda con su motivo y en la auditoría', async () => {
    const id = await bienDeControl();
    const vendedor = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Vendedor',
      apellidos: 'Sin costo',
      permisos: ['activos-fijos.bajas.crear', 'activos-fijos.activos.ver'],
    });
    const contador = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Contador',
      apellidos: 'Con costo',
      permisos: ['activos-fijos.bajas.crear', 'activos-fijos.bajas.costo-fiscal-manual', 'activos-fijos.activos.ver'],
    });
    const pedido = venta(id, { costoFiscalDelContador: DEL_CONTADOR });

    const sinPermiso = await vendedor.post(BAJAS, pedido);
    const sinBaja = await comoPropietario('select 1 from activos_fijos.bajas where activo_id = $1', [id]);
    const conPermiso = await contador.post(BAJAS, pedido);

    expect([sinPermiso.estado, sinBaja]).toEqual([403, []]);
    expect(conPermiso.estado, JSON.stringify(conPermiso.cuerpo)).toBe(201);
    expect(conPermiso.cuerpo).toMatchObject({
      costoFiscal: '800.00',
      origenDelCostoFiscal: 'criterio_del_contador',
      motivoDelCostoFiscal: DEL_CONTADOR.motivo,
    });
    expect(await auditoria(conPermiso.cuerpo.id)).toMatchObject([
      { motivo: DEL_CONTADOR.motivo, anterior: { origenSegunLaRegla: 'documentado', costoFiscalSostenido: '800.00' } },
    ]);
  });

  it('en la venta de un activo con libros se rechaza (400) y no queda baja', async () => {
    const vehiculosId = await claseDe(cuenta, 'Vehículos');
    const creado = await cuenta.propietario.post(
      ACTIVOS,
      datosDeActivo(vehiculosId, { fechaDeAdquisicion: '2026-09-01' }),
    );
    await cuenta.propietario.post(`${ACTIVOS}/${creado.cuerpo.id}/costos`, {
      claseDeCosto: 'adquisicion',
      fecha: '2026-09-05',
      monto: '250000.00',
      documentoDeSoporte: 'Escritura 15',
    });
    await cuenta.propietario.post(`${ACTIVOS}/${creado.cuerpo.id}/poner-en-uso`, { fechaDeInicioDeUso: '2026-09-10' });

    const respuesta = await cuenta.propietario.post(
      BAJAS,
      venta(creado.cuerpo.id, { costoFiscalDelContador: DEL_CONTADOR }),
    );

    expect([respuesta.estado, respuesta.cuerpo.error.codigo]).toEqual([400, 'baja_invalida']);
  });
});
