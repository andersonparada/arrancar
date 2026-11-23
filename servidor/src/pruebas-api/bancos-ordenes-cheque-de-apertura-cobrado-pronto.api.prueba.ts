/**
 * AP-2: el posfechado de la carga inicial marcado en la primera conciliación de su cuenta (contador, 19/11/2026): el
 * aviso «cobrado pronto» al ligarlo y al marcarlo; en una conciliación posterior no avisa.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { Operador } from '../modulos/core/compartido/aplicacion/operador.js';
import { empresaConInicio } from './soporte/apertura-por-api.js';
import { idsDe, iniciarMes, marcar, terminarYAutorizar } from './soporte/conciliaciones-de-apertura.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, type CuentaDePrueba } from './soporte/escenarios.js';
import { MODULOS_CON_CUENTAS_POR_PAGAR, operadorDeLaCuenta } from './soporte/ordenes-de-bancos.js';
import { cuentaConPosfechado, ordenesDeChequeDeApertura } from './soporte/ordenes-de-cheque-de-apertura.js';
import type { ClienteApi } from './soporte/cliente-api.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let operador: Operador;
let autoriza: ClienteApi;
const usuario = () => cuenta.propietario;
const { ligar } = ordenesDeChequeDeApertura(() => operador);
const cuentaConPosfechadoNuevo = () => cuentaConPosfechado(usuario());

beforeAll(async () => {
  cuenta = await empresaConInicio(entorno, {
    nombre: 'Cheques de apertura cobrados pronto',
    usuario: 'propietariocobradopronto',
    modulos: MODULOS_CON_CUENTAS_POR_PAGAR,
  });
  operador = await operadorDeLaCuenta(cuenta);
  autoriza = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Autoriza',
    apellidos: 'Cobrado',
    permisos: ['bancos.conciliaciones.ver', 'bancos.conciliaciones.autorizar'],
  });
});

describe('el posfechado cobrado en la primera conciliación', () => {
  it('ligar un posfechado marcado en la primera conciliación avisa (no bloquea)', async () => {
    const { cuentaId, movimientoId } = await cuentaConPosfechadoNuevo();
    const enero = await iniciarMes(usuario(), cuentaId, 1);
    await marcar(usuario(), enero.id, idsDe(enero.posfechadosCandidatos));

    const respuesta = await ligar({ movimientoId });

    expect(respuesta.avisos).toEqual([
      expect.objectContaining({
        codigo: 'posfechado_cobrado_pronto',
        mensaje: expect.stringContaining('31/12/2025'),
      }),
    ]);
  });

  it('marcarlo en la primera conciliación avisa una vez; marcarlo en una posterior no avisa', async () => {
    const { cuentaId } = await cuentaConPosfechadoNuevo();
    const enero = await iniciarMes(usuario(), cuentaId, 1);
    const ids = idsDe(enero.posfechadosCandidatos);

    const marcadoEnLaPrimera = await usuario().put(`/api/bancos/conciliaciones/${enero.id}/marcas`, {
      movimientoIds: ids,
    });
    const otraVez = await marcar(usuario(), enero.id, ids);

    expect(marcadoEnLaPrimera.cuerpo.avisos).toEqual([
      expect.objectContaining({ codigo: 'posfechado_cobrado_pronto' }),
    ]);
    expect(otraVez.avisos).toBeUndefined();
    await marcar(usuario(), enero.id, []);
    await terminarYAutorizar(usuario(), autoriza, enero.id);
    const febrero = await iniciarMes(usuario(), cuentaId, 2);
    const enFebrero = await marcar(
      usuario(),
      febrero.id,
      idsDe(febrero.candidatos, (c) => c.parteDeApertura === 'cheque_posfechado'),
    );
    expect(enFebrero.avisos).toBeUndefined();
    expect(enFebrero.candidatos.some((c: { marcado: boolean }) => c.marcado)).toBe(true);
  });

  it('un posfechado sin marcar en enero, ligado después, no avisa', async () => {
    const { cuentaId, movimientoId } = await cuentaConPosfechadoNuevo();
    const enero = await iniciarMes(usuario(), cuentaId, 1);
    await terminarYAutorizar(usuario(), autoriza, enero.id);
    const febrero = await iniciarMes(usuario(), cuentaId, 2);
    await marcar(usuario(), febrero.id, idsDe(febrero.candidatos));

    const respuesta = await ligar({ movimientoId });

    expect(respuesta.avisos).toEqual([]);
  });
});
