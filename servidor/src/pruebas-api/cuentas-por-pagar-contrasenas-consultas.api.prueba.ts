/**
 * Contraseñas de pago (CP3-2): lista, ficha, documentos disponibles, el reinicio anual del correlativo y los permisos.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { consultar, HOY } from './soporte/escenario-de-documentos.js';
import { MODULOS_DE_CUENTAS_POR_PAGAR } from './soporte/cuentas-por-pagar.js';
import { darDeAltaCuenta } from './soporte/escenarios.js';
import {
  cuerpoDeContrasena as cuerpoDe,
  EscenarioDeContrasenas,
  RUTA_DE_CONTRASENAS as RUTA,
} from './soporte/cuentas-por-pagar-contrasenas.js';
import { usarEntornoApi } from './soporte/entorno-api.js';

const REINICIO_ANUAL = 'core.correlativos.reinicio_anual';
const entorno = usarEntornoApi();
let mundo: EscenarioDeContrasenas;

beforeAll(async () => {
  mundo = await EscenarioDeContrasenas.preparar(entorno, 'cxpcontrasenasb');
});

describe('consultas', () => {
  it('los documentos disponibles dejan fuera lo que ya está en una contraseña vigente y proponen la fecha de pago', async () => {
    const proveedor = await mundo.unProveedor();
    const [enContrasena, libre] = [await mundo.unCargo(proveedor), await mundo.unCargo(proveedor, '30000.00')];
    await mundo.crear(cuerpoDe(proveedor.proveedorId, [enContrasena]));

    const respuesta = await mundo.propietario().get(`${RUTA}/disponibles?proveedorId=${proveedor.proveedorId}`);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo.cargos.map((c: { documentoId: string }) => c.documentoId)).toEqual([libre]);
    expect(respuesta.cuerpo.cargos[0]).toMatchObject({ sobreUmbralDeBancarizacion: true, saldo: '30000.00' });
    expect(respuesta.cuerpo.notas).toEqual([]);
    expect(respuesta.cuerpo.umbralDeBancarizacion).toBe('30000.00');
    expect(respuesta.cuerpo.fechaDePagoPropuesta).toBe(respuesta.cuerpo.cargos[0].vencimiento ?? HOY);
  });

  it('una contraseña anulada solo sale al pedirla, y una ajena o inexistente es 404', async () => {
    const proveedor = await mundo.unProveedor();
    const creada = await mundo.crear(cuerpoDe(proveedor.proveedorId, [await mundo.unCargo(proveedor)]));
    await consultar(
      `update cuentas_por_pagar.contrasenas set estado = 'anulada', anulada_en = now(), anulada_por = creado_por,
              motivo_de_anulacion = 'Error' where id = $1`,
      [creada.cuerpo.id],
    );
    const filtro = `proveedorId=${proveedor.proveedorId}`;

    const vigentes = await mundo.propietario().get(`${RUTA}?${filtro}`);
    const anuladas = await mundo.propietario().get(`${RUTA}?${filtro}&estado=anulada`);
    const ficha = await mundo.propietario().get(`${RUTA}/${creada.cuerpo.id}`);
    const inexistente = await mundo.propietario().get(`${RUTA}/${crypto.randomUUID()}`);

    expect(vigentes.cuerpo.elementos).toEqual([]);
    expect(anuladas.cuerpo.elementos).toEqual([expect.objectContaining({ id: creada.cuerpo.id, estado: 'anulada' })]);
    expect(ficha.cuerpo).toMatchObject({
      estado: 'anulada',
      puedeEditar: false,
      anulacion: expect.objectContaining({ motivo: 'Error' }),
    });
    expect(inexistente.estado).toBe(404);
  });

  it('otra cuenta no ve la contraseña', async () => {
    const proveedor = await mundo.unProveedor();
    const creada = await mundo.crear(cuerpoDe(proveedor.proveedorId, [await mundo.unCargo(proveedor)]));
    const ajena = await darDeAltaCuenta(entorno, {
      nombre: 'Ajena',
      usuario: 'cxpcontrasenasajena',
      modulos: MODULOS_DE_CUENTAS_POR_PAGAR,
    });

    expect((await ajena.propietario.get(`${RUTA}/${creada.cuerpo.id}`)).estado).toBe(404);
  });
});

describe('correlativo', () => {
  it('con reinicio anual el número lleva el año de la contraseña', async () => {
    await entorno.soporte.put('/api/sesion/empresa-activa', { empresaId: mundo.escenario.cuenta.empresaId });
    const activar = await entorno.soporte.put(`/api/configuracion/${REINICIO_ANUAL}`, {
      nivel: 'empresa',
      valor: true,
    });
    expect(activar.estado, JSON.stringify(activar.cuerpo)).toBe(204);
    const proveedor = await mundo.unProveedor();
    const cargo = await mundo.unCargo(proveedor);

    const respuesta = await mundo.crear(cuerpoDe(proveedor.proveedorId, [cargo]));
    await entorno.soporte.put(`/api/configuracion/${REINICIO_ANUAL}`, { nivel: 'empresa', valor: false });

    const anio = Number(HOY.slice(0, 4));
    expect(respuesta.cuerpo).toMatchObject({ numero: `${anio}-1`, numeroCorrelativo: 1, anioDeNumero: anio });
  });
});

describe('permisos', () => {
  it('quien solo ve, lista y consulta pero no crea; sin permiso de contraseñas no ve nada', async () => {
    const proveedor = await mundo.unProveedor();
    const cargo = await mundo.unCargo(proveedor);

    expect((await mundo.usuarios.soloVer.get(RUTA)).estado).toBe(200);
    expect((await mundo.usuarios.soloVer.get(`${RUTA}/disponibles?proveedorId=${proveedor.proveedorId}`)).estado).toBe(
      200,
    );
    expect((await mundo.crear(cuerpoDe(proveedor.proveedorId, [cargo]), mundo.usuarios.soloVer)).estado).toBe(403);
    expect((await mundo.usuarios.sinPermisos.get(RUTA)).estado).toBe(403);
    expect((await mundo.crear(cuerpoDe(proveedor.proveedorId, [cargo]), mundo.usuarios.sinPermisos)).estado).toBe(403);
  });
});
