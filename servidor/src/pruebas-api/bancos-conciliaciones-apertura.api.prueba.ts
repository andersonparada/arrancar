/**
 * BS-4: la primera conciliación de una cuenta cargada con el saldo del banco (§2.4): sale del saldo del estado de
 * cuenta al corte, el saldo del banco no es candidato y la primera solo puede ser del mes de la fecha de inicio.
 */
import { describe, expect, it } from 'vitest';
import { agregarPartida, empresaConInicio, guardarSaldo, partida } from './soporte/apertura-por-api.js';
import {
  type Candidato,
  cuentaConPartidas,
  idsDe,
  iniciarMes,
  marcar,
  RUTA,
  terminarYAutorizar,
} from './soporte/conciliaciones-de-apertura.js';
import { crearCuentaSinSaldo } from './soporte/escenarios-de-apertura.js';
import { conceptoGeneral } from './soporte/escenarios-de-bancos.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();

describe('primera conciliación con el corte a fin de mes (fecha de inicio el 1 de enero)', () => {
  it('con todo marcado el banco queda en el saldo del estado de cuenta; el saldo del banco no es candidato', async () => {
    const cuenta = await empresaConInicio(entorno, { nombre: 'Apertura fin de mes', usuario: 'aperturafindemes' });
    const cuentaId = await cuentaConPartidas(cuenta.propietario);

    const documento = await iniciarMes(cuenta.propietario, cuentaId, 1);
    const candidatos = documento.candidatos as Candidato[];

    expect(candidatos.map((c) => c.parteDeApertura).sort()).toEqual([
      'cheque_en_circulacion',
      'deposito_en_transito',
      'error_del_banco',
    ]);
    expect(documento.saldoInicialDelBancoDeLaApertura).toEqual({ fecha: '2025-12-31', monto: '1000.00' });
    expect(documento.cuadratica.banco.saldoInicial).toBe('1000.00');
    expect(documento.cuadratica.libros).toMatchObject({ saldoInicial: '980.00', saldoFinal: '980.00' });
    // Sin marcar: el banco todavía no vio nada de lo que la empresa cargó; cuadra contra su propio saldo.
    expect(documento.saldoQueDebeMostrarElEstadoDeCuenta).toBe('1000.00');
    expect(documento.partidas.chequesEnCirculacion[0]).toMatchObject({ monto: '100.00', deApertura: true });
    expect(documento.partidas.chequesEnCirculacion[0].parteDeApertura).toBe('cheque_en_circulacion');

    const marcado = await marcar(cuenta.propietario, documento.id, idsDe(candidatos));
    expect(marcado.cuadratica.banco).toEqual({
      saldoInicial: '1000.00',
      ingresos: '80.00',
      egresos: '100.00',
      saldoFinal: '980.00',
    });
    expect(marcado.saldoQueDebeMostrarElEstadoDeCuenta).toBe('980.00');
    expect(marcado.partidas.chequesEnCirculacion).toEqual([]);
  });

  it('el cheque de la carga que se cobra en febrero sigue en circulación en enero ya autorizada', async () => {
    const cuenta = await empresaConInicio(entorno, { nombre: 'Apertura cheque febrero', usuario: 'aperturachequefeb' });
    const cuentaId = await cuentaConPartidas(cuenta.propietario);
    const autoriza = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Autoriza',
      apellidos: 'Apertura',
      permisos: ['bancos.conciliaciones.ver', 'bancos.conciliaciones.autorizar'],
    });
    const enero = await iniciarMes(cuenta.propietario, cuentaId, 1);
    const sinElCheque = idsDe(enero.candidatos, (c) => c.parteDeApertura !== 'cheque_en_circulacion');
    await marcar(cuenta.propietario, enero.id, sinElCheque);
    await terminarYAutorizar(cuenta.propietario, autoriza, enero.id);

    const febrero = await iniciarMes(cuenta.propietario, cuentaId, 2);
    expect(febrero.cuadratica.banco.saldoInicial).toBe('1080.00');
    expect(febrero.saldoInicialDelBancoDeLaApertura).toBeNull();
    const cheque = idsDe(febrero.candidatos, (c) => c.parteDeApertura === 'cheque_en_circulacion');
    await marcar(cuenta.propietario, febrero.id, cheque);

    const enEnero = (await cuenta.propietario.get(`${RUTA}/${enero.id}`)).cuerpo;
    expect(enEnero.partidas.chequesEnCirculacion).toHaveLength(1);
    expect(enEnero.saldoQueDebeMostrarElEstadoDeCuenta).toBe('1080.00');
  });
});

describe('primera conciliación con el corte a mitad de mes (fecha de inicio el 16 de enero)', () => {
  it('los libros parten del saldo al corte, solo cuentan lo posterior y el banco cuadra con todo marcado', async () => {
    const cuenta = await empresaConInicio(entorno, {
      nombre: 'Apertura a mitad de mes',
      usuario: 'aperturamitad',
      fechaDeInicio: '2026-01-16',
    });
    const cuentaId = await crearCuentaSinSaldo(cuenta.propietario);
    await guardarSaldo(cuenta.propietario, cuentaId, '1000.00');
    await agregarPartida(cuenta.propietario, cuentaId, partida('cheque_en_circulacion', { fecha: '2026-01-10' }));
    const concepto = await conceptoGeneral(cuenta.propietario);
    const nota = await cuenta.propietario.post('/api/bancos/notas', {
      ...{ cuentaBancariaId: cuentaId, tipo: 'credito', conceptoId: concepto, fecha: '2026-01-20' },
      ...{ monto: '200.00', referencia: null, beneficiario: null, observaciones: null },
    });
    expect(nota.estado).toBe(201);

    const documento = await iniciarMes(cuenta.propietario, cuentaId, 1);
    expect(documento.saldoInicialDelBancoDeLaApertura).toEqual({ fecha: '2026-01-15', monto: '1000.00' });
    expect(documento.cuadratica.libros).toEqual({
      saldoInicial: '900.00',
      ingresos: '200.00',
      egresos: '0.00',
      saldoFinal: '1100.00',
    });

    const marcado = await marcar(cuenta.propietario, documento.id, idsDe(documento.candidatos));
    expect(marcado.cuadratica.banco.saldoFinal).toBe('1100.00');
    expect(marcado.saldoQueDebeMostrarElEstadoDeCuenta).toBe('1100.00');
  });
});

describe('la primera conciliación de una cuenta con saldo del banco es del mes de la fecha de inicio', () => {
  it('otro mes se rechaza (422) con el periodo esperado; con el saldo en cero también', async () => {
    const cuenta = await empresaConInicio(entorno, { nombre: 'Apertura otro mes', usuario: 'aperturaotromes' });
    const conSaldo = await cuentaConPartidas(cuenta.propietario);
    const enCero = await crearCuentaSinSaldo(cuenta.propietario);
    await guardarSaldo(cuenta.propietario, enCero, '0.00');

    for (const cuentaBancariaId of [conSaldo, enCero]) {
      const rechazada = await cuenta.propietario.post(RUTA, { cuentaBancariaId, anio: 2026, mes: 2 });
      expect(rechazada.estado).toBe(422);
      expect(rechazada.cuerpo.error.codigo).toBe('primera_conciliacion_de_otro_mes');
      expect(rechazada.cuerpo.error.mensaje).toContain('01/2026');
      const lista = await cuenta.propietario.get(`/api/bancos/cuentas-bancarias/${cuentaBancariaId}/conciliaciones`);
      expect(lista.cuerpo).toEqual({ conciliaciones: [], periodoSiguiente: { anio: 2026, mes: 1 } });
    }
    expect((await cuenta.propietario.post(RUTA, { cuentaBancariaId: enCero, anio: 2026, mes: 1 })).estado).toBe(201);
  });
});
