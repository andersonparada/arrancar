import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearCuentaBancaria } from './soporte/escenarios-de-bancos.js';
import {
  crearConcepto,
  crearEscenarioDeSugerencias,
  type EscenarioDeSugerencias,
} from './soporte/escenario-de-sugerencias.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA_NOTAS = '/api/bancos/notas';
const RUTA_SUGERENCIAS = `${RUTA_NOTAS}/sugerencias-de-concepto`;
const entorno = usarEntornoApi();

let ajena: CuentaDePrueba;

let cuenta: CuentaDePrueba;
let e: EscenarioDeSugerencias;
let cuentaBancariaId = '';
let pagoAProveedores = '';
let mantenimiento = '';
let comisiones = '';

const nota = (cambios: Record<string, unknown> = {}) => e.nota(cambios);
const notaPendiente = (cambios: Record<string, unknown> = {}) => e.notaPendiente(cambios);
const notaClasificada = (cambios: Record<string, unknown> = {}) => e.notaClasificada(cambios);
const emitirCheque = (cambios: Record<string, unknown> = {}) => e.emitirCheque(cambios);
const dejarSinClasificar = (id: string) => e.dejarSinClasificar(id);

async function prepararEscenario(nombre: string, usuario: string) {
  cuenta = await darDeAltaCuenta(entorno, { nombre, usuario, modulos: ['bancos'] });
  e = await crearEscenarioDeSugerencias(cuenta, nombre);
  ({ cuentaBancariaId, pagoAProveedores, mantenimiento, comisiones } = e);
}

const sugerenciasDe = async (usuario: ClienteApi = cuenta.propietario) =>
  (await usuario.get(`${RUTA_SUGERENCIAS}?cuentaBancariaId=${cuentaBancariaId}`)).cuerpo;

const deLaBandeja = (respuesta: any, id: string) => respuesta.sugerencias.find((s: any) => s.movimientoId === id);

beforeAll(async () => {
  await prepararEscenario('Sugerencias', 'propietariosugiere');
  ajena = await darDeAltaCuenta(entorno, {
    nombre: 'Sugerencias B',
    usuario: 'propietariosugiereb',
    modulos: ['bancos'],
  });
});

describe('GET sugerencias-de-concepto (bandeja)', () => {
  it('con dos casos del mismo beneficiario (escrito distinto) el tercero sale sugerido, y clasificarlo enseña al siguiente', async () => {
    await notaClasificada({ beneficiario: 'Ferretería Pinos, S.A.', monto: '15.00', fecha: '2026-01-20' });
    await notaClasificada({ beneficiario: 'FERRETERIA  pinos', monto: '18.00', fecha: '2026-01-25' });
    const primero = await notaPendiente({ beneficiario: 'ferreteria pinos sa', monto: '16.00', fecha: '2026-02-01' });

    const antes = await sugerenciasDe();

    expect(antes).toMatchObject({ confianzaMinima: 60, vidaMediaDias: 180, truncado: false });
    const sugerencia = deLaBandeja(antes, primero);
    expect(sugerencia.sugerido).toMatchObject({
      conceptoId: mantenimiento,
      conceptoNombre: 'Mantenimiento',
      porque: {
        base: 'mismo_beneficiario',
        casos: 2,
        ultimaFecha: '2026-01-25',
        montoMinimo: '15.00',
        montoMaximo: '18.00',
        beneficiarioParecido: null,
      },
    });
    expect(sugerencia.sugerido.confianza).toBeGreaterThanOrEqual(60);

    const clasificar = await cuenta.propietario.post(`${RUTA_NOTAS}/reclasificar`, {
      movimientoIds: [primero],
      conceptoId: mantenimiento,
    });
    const segundo = await notaPendiente({ beneficiario: 'Ferretería Pinos', fecha: '2026-02-02' });
    const despues = deLaBandeja(await sugerenciasDe(), segundo);

    expect(clasificar.estado).toBe(200);
    expect(despues.casosComparados).toBe(3);
    expect(deLaBandeja(await sugerenciasDe(), primero)).toBeUndefined();
  });

  it('sin beneficiario mira la misma cuenta, su texto y el monto, y sin ejemplos devuelve la sugerencia vacía', async () => {
    const comision = (fecha: string) => ({
      monto: '3.00',
      fecha,
      observaciones: 'Comisión mensual',
      conceptoId: comisiones,
    });
    await notaClasificada(comision('2026-01-10'));
    await notaClasificada(comision('2026-01-11'));
    const pendiente = await notaPendiente({ ...comision('2026-02-10'), conceptoId: mantenimiento });
    const suelta = await notaPendiente({ beneficiario: 'Nadie conocido', fecha: '2026-02-11' });

    const respuesta = await sugerenciasDe();

    expect(deLaBandeja(respuesta, pendiente).sugerido).toMatchObject({
      conceptoId: comisiones,
      porque: expect.objectContaining({ base: 'misma_cuenta_sin_beneficiario' }),
    });
    expect(deLaBandeja(respuesta, suelta)).toEqual({
      movimientoId: suelta,
      sugerido: null,
      alternativas: [],
      casosComparados: 0,
    });
  });

  it('un caso solo no basta para «Sugerido»: sale como alternativa', async () => {
    await notaClasificada({ beneficiario: 'Único caso', conceptoId: comisiones });
    const pendiente = await notaPendiente({ beneficiario: 'Único caso' });

    const sugerencia = deLaBandeja(await sugerenciasDe(), pendiente);

    expect(sugerencia.sugerido).toBeNull();
    expect(sugerencia.alternativas[0]).toMatchObject({ conceptoId: comisiones, confianza: 50 });
  });

  it('no sugiere ni enseña lo de otro módulo, los inversos, el saldo inicial ni lo que sigue sin clasificar', async () => {
    const beneficiario = 'Solo exclusiones';
    const conOrigen = await notaClasificada({ beneficiario });
    await comoPropietario(
      "update bancos.movimientos set modulo_de_origen = 'cuentas-por-pagar', documento_de_origen_id = gen_random_uuid() where id = $1",
      [conOrigen],
    );
    const anulada = await notaClasificada({ beneficiario, fecha: '2026-02-03' });
    await cuenta.propietario.post(`${RUTA_NOTAS}/${anulada}/anular`, { motivo: 'Error', fecha: '2026-02-04' });
    const pendienteConOrigen = await notaPendiente({ beneficiario: 'Otro módulo' });
    await comoPropietario(
      "update bancos.movimientos set modulo_de_origen = 'cuentas-por-pagar', documento_de_origen_id = gen_random_uuid() where id = $1",
      [pendienteConOrigen],
    );
    const pendiente = await notaPendiente({ beneficiario, fecha: '2026-02-05' });
    const otroPendiente = await notaPendiente({ beneficiario, fecha: '2026-02-06' });

    const respuesta = await sugerenciasDe();

    const ids = respuesta.sugerencias.map((s: any) => s.movimientoId);
    expect(ids).toContain(pendiente);
    expect(ids).not.toContain(pendienteConOrigen);
    expect(deLaBandeja(respuesta, pendiente).casosComparados).toBe(1);
    expect(deLaBandeja(respuesta, otroPendiente).casosComparados).toBe(1);
    const saldos = await comoPropietario<{ id: string }>(
      'select id from bancos.movimientos where saldo_inicial and cuenta_bancaria_id = $1',
      [cuentaBancariaId],
    );
    expect(ids).not.toContain(saldos[0]?.id);
  });

  it('otra empresa con el mismo beneficiario no influye', async () => {
    const usuarioAjeno = ajena.propietario;
    const cuentaAjena = await crearCuentaBancaria(usuarioAjeno, 'Ajena de sugerencias');
    const conceptoAjeno = await crearConcepto(usuarioAjeno, 'Ajeno');
    for (const fecha of ['2026-01-10', '2026-01-11', '2026-01-12']) {
      const creada = await usuarioAjeno.post(RUTA_NOTAS, {
        ...nota({ cuentaBancariaId: cuentaAjena, beneficiario: 'Beneficiario compartido', fecha }),
        conceptoId: conceptoAjeno,
      });
      expect(creada.estado).toBe(201);
    }
    const pendiente = await notaPendiente({ beneficiario: 'Beneficiario compartido' });

    expect(deLaBandeja(await sugerenciasDe(), pendiente).casosComparados).toBe(0);
  });

  it('pide bancos.notas.editar', async () => {
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Lector1',
      apellidos: 'Lectura de sugerencias',
      permisos: ['bancos.notas.ver'],
    });

    expect((await lector.get(RUTA_SUGERENCIAS)).estado).toBe(403);
  });

  it('la configuración de la empresa cambia el resultado y valida sus límites', async () => {
    await notaClasificada({ beneficiario: 'Configurable' });
    await notaClasificada({ beneficiario: 'Configurable', fecha: '2026-01-31' });
    const pendiente = await notaPendiente({ beneficiario: 'Configurable' });
    await entorno.soporte.put('/api/sesion/empresa-activa', { empresaId: cuenta.empresaId });
    const clave = 'bancos.sugerencias.confianza_minima';

    expect((await entorno.soporte.put(`/api/configuracion/${clave}`, { nivel: 'empresa', valor: 80 })).estado).toBe(
      204,
    );
    const exigente = await sugerenciasDe();
    const fueraDeRango = await entorno.soporte.put('/api/configuracion/bancos.sugerencias.vida_media_dias', {
      nivel: 'empresa',
      valor: 10,
    });
    await entorno.soporte.delete(`/api/configuracion/${clave}?nivel=empresa`);
    const normal = await sugerenciasDe();

    expect(exigente.confianzaMinima).toBe(80);
    expect(deLaBandeja(exigente, pendiente).sugerido).toBeNull();
    expect(fueraDeRango.estado).toBe(400);
    expect(normal.confianzaMinima).toBe(60);
    expect(deLaBandeja(normal, pendiente).sugerido).not.toBeNull();
  });

  it('a un cheque pendiente le sugiere «Pago a proveedores» (P3) si así se clasificaron los otros', async () => {
    await emitirCheque({ beneficiario: 'Veterinaria Central' });
    await emitirCheque({ beneficiario: 'Veterinaria Central', fecha: '2026-02-06' });
    const pendiente = await emitirCheque({ beneficiario: 'Veterinaria Central', fecha: '2026-02-07' });
    await dejarSinClasificar(pendiente.movimientoId);

    const sugerencia = deLaBandeja(await sugerenciasDe(), pendiente.movimientoId);

    expect(sugerencia.sugerido).toMatchObject({ conceptoId: pagoAProveedores, conceptoNombre: 'Pago a proveedores' });
  });
});
