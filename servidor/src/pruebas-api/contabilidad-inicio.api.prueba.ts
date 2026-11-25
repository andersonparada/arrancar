import { beforeAll, describe, expect, it } from 'vitest';
import { empresaConInicio } from './soporte/apertura-por-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/contabilidad/inicio';
const MODULOS = ['terceros', 'contabilidad'];
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;

const inicio = (cambios: Record<string, unknown> = {}) => ({
  fecha: '2026-01-01',
  caso: 'desde_la_carga',
  mascara: '9.9.99.99.999',
  ...cambios,
});

beforeAll(async () => {
  cuenta = await empresaConInicio(entorno, { nombre: 'Inicio', usuario: 'propietarioinicio', modulos: MODULOS });
});

describe('inicio de la contabilidad por API', () => {
  it('antes de iniciar no existe y no se pueden crear cuentas', async () => {
    const sinIniciar = await cuenta.propietario.get(RUTA);
    const cuentaSinMascara = await cuenta.propietario.post('/api/contabilidad/cuentas', {
      codigo: '1',
      nombre: 'Activo',
      naturaleza: 'deudora',
      tipo: 'balance',
    });

    expect(sinIniciar.estado).toBe(404);
    expect(cuentaSinMascara.estado).toBe(422);
    expect(cuentaSinMascara.cuerpo.error.codigo).toBe('contabilidad_sin_iniciar');
  });

  it('inicia con la fecha de inicio de la empresa y devuelve lo guardado', async () => {
    const guardado = await cuenta.propietario.put(RUTA, inicio({ firmaRepresentante: 'Ana Pérez' }));

    expect(guardado.estado).toBe(200);
    expect(guardado.cuerpo).toMatchObject({
      fecha: '2026-01-01',
      caso: 'desde_la_carga',
      firmaRepresentante: 'Ana Pérez',
    });
    expect((await cuenta.propietario.get(RUTA)).cuerpo).toEqual(guardado.cuerpo);
  });

  it('cambia los firmantes y la máscara mientras no haya cuentas', async () => {
    const cambiado = await cuenta.propietario.put(
      RUTA,
      inicio({ mascara: '9.9.99.99', firmaContador: 'Luis Gómez', registroDelContador: '1234' }),
    );

    expect(cambiado.cuerpo).toMatchObject({
      mascara: '9.9.99.99',
      firmaContador: 'Luis Gómez',
      registroDelContador: '1234',
    });
  });

  it('la máscara no cambia una vez que hay cuentas', async () => {
    await cuenta.propietario.post('/api/contabilidad/cuentas', {
      codigo: '1',
      nombre: 'Activo',
      naturaleza: 'deudora',
      tipo: 'balance',
    });

    const cambio = await cuenta.propietario.put(RUTA, inicio({ mascara: '9.9.99.99.999' }));

    expect(cambio.estado).toBe(422);
    expect(cambio.cuerpo.error.codigo).toBe('mascara_con_cuentas');
  });

  it('rechaza una máscara mal escrita, una fecha que no es la de la carga y el contador sin registro', async () => {
    const mascara = await cuenta.propietario.put(RUTA, inicio({ mascara: '9.9' }));
    const fecha = await cuenta.propietario.put(RUTA, inicio({ mascara: '9.9.99.99', fecha: '2026-03-01' }));
    const contador = await cuenta.propietario.put(RUTA, inicio({ mascara: '9.9.99.99', firmaContador: 'Luis' }));

    expect([mascara.estado, fecha.estado, contador.estado]).toEqual([400, 400, 400]);
    expect(mascara.cuerpo.error.codigo).toBe('mascara_invalida');
    expect(fecha.cuerpo.error.codigo).toBe('inicio_invalido');
  });

  it('desde una fecha posterior exige la carga cerrada', async () => {
    const abierta = await cuenta.propietario.put(
      RUTA,
      inicio({ mascara: '9.9.99.99', caso: 'posterior', fecha: '2026-07-01' }),
    );

    expect(abierta.estado).toBe(422);
    expect(abierta.cuerpo.error.codigo).toBe('carga_inicial_abierta');
  });

  it('cada acción exige su permiso', async () => {
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo',
      apellidos: 'Lectura',
      permisos: ['contabilidad.inicio.ver'],
    });

    expect((await lector.get(RUTA)).estado).toBe(200);
    expect((await lector.put(RUTA, inicio())).estado).toBe(403);
  });

  it('sin el módulo activo no hay acceso', async () => {
    const sinModulo = await darDeAltaCuenta(entorno, {
      nombre: 'Sin',
      usuario: 'propietariosinconta',
      modulos: ['terceros'],
    });

    expect((await sinModulo.propietario.get(RUTA)).estado).toBe(403);
  });
});
