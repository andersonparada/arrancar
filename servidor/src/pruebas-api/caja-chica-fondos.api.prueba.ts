/**
 * Abrir un fondo de Caja chica (CC-2): el cheque o la nota de Bancos con el fondo como origen y el concepto «Fondo de caja
 * chica», el custodio (con usuario o sin él), lo que se rechaza, la lista y la ficha, y quién ve cada fondo.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import {
  cambiosEnBase,
  conAccesoAlFondo,
  EscenarioDeCajaChica,
  fondoEnBase,
  movimientoDeBancos,
  RUTA_DE_FONDOS,
} from './soporte/caja-chica-fondos.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { HOY } from './soporte/escenario-de-documentos.js';
import { saldoDe } from './soporte/escenarios-de-bancos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import { auditoriaDe } from './soporte/ordenes-de-bancos.js';

const entorno = usarEntornoApi();
let e: EscenarioDeCajaChica;
let soloVe: ClienteApi;
let sinPermisos: ClienteApi;

beforeAll(async () => {
  e = await EscenarioDeCajaChica.preparar(entorno, 'cajachicafondos');
  soloVe = await crearUsuarioConPermisos(entorno, e.cuenta, {
    nombres: 'Solo',
    apellidos: 'Ve',
    permisos: ['caja-chica.fondos.ver'],
  });
  sinPermisos = await crearUsuarioConPermisos(entorno, e.cuenta, {
    nombres: 'Sin',
    apellidos: 'Permisos',
    permisos: ['bancos.cuentas-bancarias.ver'],
  });
});

describe('abrir con cheque', () => {
  it('emite el cheque no negociable a nombre del custodio, con el fondo como origen y el concepto de sistema', async () => {
    const saldoAntes = await saldoDe(e.propietario(), e.cuentaBancariaId);

    const fondo = await e.abrir(e.conCheque('Caja de la finca', { monto: '1500.00', topePorComprobante: '300.00' }));

    expect(fondo).toMatchObject({
      nombre: 'Caja de la finca',
      estado: 'abierto',
      custodio: 'Juan Pérez',
      monto: '1500.00',
      efectivoEsperado: '1500.00',
      pendienteDeReponer: '0.00',
      valesAbiertos: '0.00',
      topePorComprobante: '300.00',
      aperturaAnulada: false,
      puedeAnularApertura: true,
      puedeEditar: true,
      cuentaBancariaNombre: expect.any(String),
    });
    expect(fondo.cambiosDeMonto).toMatchObject([{ tipo: 'apertura', forma: 'cheque', monto: '1500.00' }]);
    const [apertura] = await cambiosEnBase(fondo.id);
    const movimiento = await movimientoDeBancos(apertura!.movimiento_id!);
    expect(movimiento).toMatchObject({
      modulo: 'caja-chica',
      origen: fondo.id,
      beneficiario: 'Juan Pérez',
      no_negociable: true,
      concepto: 'fondo_de_caja_chica',
    });
    expect(Number(saldoAntes) - Number(await saldoDe(e.propietario(), e.cuentaBancariaId))).toBe(1500);
    expect((await fondoEnBase(fondo.id)).cuenta_bancaria_id).toBe(e.cuentaBancariaId);
  });

  it('con otro beneficiario, el cheque va a ese nombre; «al portador» se rechaza y no se guarda nada', async () => {
    const otro = await e.abrir(e.conCheque('Caja con beneficiario', { beneficiario: 'Ferretería La Paz' }));
    const [apertura] = await cambiosEnBase(otro.id);
    expect((await movimientoDeBancos(apertura!.movimiento_id!)).beneficiario).toBe('Ferretería La Paz');

    const rechazo = await e
      .propietario()
      .post(RUTA_DE_FONDOS, e.conCheque('Caja al portador', { beneficiario: 'Al portador' }));

    expect(rechazo.estado).toBeGreaterThanOrEqual(400);
    expect(rechazo.cuerpo.error.codigo).toBe('beneficiario_invalido');
    expect(
      (await e.propietario().get(`${RUTA_DE_FONDOS}?estado=todos`)).cuerpo.elementos.map(
        (f: { nombre: string }) => f.nombre,
      ),
    ).not.toContain('Caja al portador');
  });
});

describe('abrir con nota de débito', () => {
  it('registra la nota de débito con la referencia y el concepto, y el custodio es el beneficiario', async () => {
    const fondo = await e.abrir(e.conNota('Caja con nota', { monto: '800.00' }));

    const [apertura] = await cambiosEnBase(fondo.id);
    expect(apertura).toMatchObject({ tipo: 'apertura', forma: 'nota_de_debito', monto: '800.00' });
    expect(await movimientoDeBancos(apertura!.movimiento_id!)).toMatchObject({
      tipo: 'debito',
      modulo: 'caja-chica',
      origen: fondo.id,
      beneficiario: 'Juan Pérez',
    });
  });
});

describe('custodio', () => {
  it('un usuario de la empresa como custodio toma su nombre y recibe el acceso al fondo al nombrarlo', async () => {
    const [fila] = await comoPropietario<{ id: string; usuario: string }>(
      `select u.id, u.usuario from core.usuarios u join core.empresa_usuarios eu on eu.usuario_id = u.id
        where u.nombres = 'Solo' and eu.empresa_id = $1`,
      [e.cuenta.empresaId],
    );

    const fondo = await e.abrir(e.conCheque('Caja del usuario', { custodio: null, custodioUsuarioId: fila!.id }));

    expect(fondo).toMatchObject({ custodio: 'Solo Ve', custodioUsuarioId: fila!.id });
    expect(await conAccesoAlFondo(fondo.id)).toEqual([fila!.usuario, 'cajachicafondos'].sort());
    const elUsuario = await soloVe.get(`${RUTA_DE_FONDOS}/${fondo.id}`);
    expect(elUsuario.estado).toBe(200);
  });

  it('sin custodio ni usuario se rechaza; un usuario que no existe también', async () => {
    const sinNadie = await e.propietario().post(RUTA_DE_FONDOS, e.conCheque('Sin custodio', { custodio: null }));
    const inexistente = await e
      .propietario()
      .post(
        RUTA_DE_FONDOS,
        e.conCheque('Custodio fantasma', { custodio: null, custodioUsuarioId: crypto.randomUUID() }),
      );

    expect(sinNadie.cuerpo.error.codigo).toBe('custodio_obligatorio');
    expect(inexistente.cuerpo.error.codigo).toBe('custodio_invalido');
  });
});

describe('lo que se rechaza al abrir', () => {
  it('monto cero, fecha futura, nombre repetido y tope en cero', async () => {
    const abrir = (cambios: Record<string, unknown>) =>
      e.propietario().post(RUTA_DE_FONDOS, e.conCheque('Caja de pruebas', cambios));
    await e.abrir(e.conCheque('Caja repetida'));

    expect((await abrir({ monto: '0.00' })).cuerpo.error.codigo).toBe('monto_del_fondo_invalido');
    expect((await abrir({ fecha: '2999-01-01' })).cuerpo.error.codigo).toBe('fecha_del_fondo_invalida');
    expect((await abrir({ nombre: 'caja REPETIDA' })).cuerpo.error.codigo).toBe('nombre_de_fondo_repetido');
    expect((await abrir({ topePorComprobante: '0.00' })).cuerpo.error.codigo).toBe('tope_del_fondo_invalido');
  });

  it('un saldo que no alcanza lo rechaza Bancos y no queda fondo', async () => {
    const respuesta = await e.propietario().post(RUTA_DE_FONDOS, e.conNota('Caja enorme', { monto: '9999999.00' }));

    expect(respuesta.estado).toBeGreaterThanOrEqual(400);
    const lista = await e.propietario().get(`${RUTA_DE_FONDOS}?estado=todos&limite=200`);
    expect(lista.cuerpo.elementos.map((f: { nombre: string }) => f.nombre)).not.toContain('Caja enorme');
  });

  it('una localidad que no existe da no encontrado', async () => {
    const respuesta = await e
      .propietario()
      .post(RUTA_DE_FONDOS, e.conCheque('Caja sin lugar', { localidadId: crypto.randomUUID() }));

    expect(respuesta.estado).toBe(404);
  });

  it('abrir exige su permiso', async () => {
    expect((await soloVe.post(RUTA_DE_FONDOS, e.conCheque('Caja sin permiso'))).estado).toBe(403);
  });
});

describe('lista y ficha', () => {
  it('sin el permiso de ver, 403; quien solo ve no ve lo que no se le asignó (404 por RLS, no 403)', async () => {
    const fondo = await e.abrir(e.conCheque('Caja privada', { fecha: HOY }));

    expect((await sinPermisos.get(RUTA_DE_FONDOS)).estado).toBe(403);
    expect((await soloVe.get(`${RUTA_DE_FONDOS}/${fondo.id}`)).estado).toBe(404);
    const lista = await soloVe.get(`${RUTA_DE_FONDOS}?estado=todos&limite=200`);
    expect(lista.cuerpo.elementos.map((f: { id: string }) => f.id)).not.toContain(fondo.id);
  });

  it('la lista trae las cifras y filtra por estado; la ficha, el historial', async () => {
    const fondo = await e.abrir(e.conCheque('Caja para la lista', { monto: '250.00' }));

    const lista = await e.propietario().get(`${RUTA_DE_FONDOS}?limite=200`);
    const fila = lista.cuerpo.elementos.find((f: { id: string }) => f.id === fondo.id);
    expect(fila).toMatchObject({
      nombre: 'Caja para la lista',
      monto: '250.00',
      custodio: 'Juan Pérez',
      estado: 'abierto',
    });
    expect((await e.propietario().get(`${RUTA_DE_FONDOS}?estado=cerrado&limite=200`)).cuerpo.elementos).toEqual([]);
    const ficha = await e.propietario().get(`${RUTA_DE_FONDOS}/${fondo.id}`);
    expect(ficha.cuerpo.custodios).toMatchObject([{ custodio: 'Juan Pérez', hasta: null, desde: HOY }]);
    expect(await auditoriaDe(fondo.id)).toEqual([]);
  });
});
