/**
 * Registrar un retiro de efectivo para pagos (CP4-E2): el cheque (a nombre del custodio o de otro, nunca al portador y no
 * negociable por omisión) o la nota de débito que Cuentas por pagar ordena a Bancos con el retiro como origen, el custodio
 * (texto o usuario de la empresa), lo que se rechaza sin guardar nada, el aviso de fin de mes y los permisos.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import {
  conceptoDelMovimiento,
  cuantosRetiros,
  movimientoDelRetiro,
  registrarRetiro,
  retiroConCheque,
  retiroConNota,
  RUTA_DE_RETIROS,
  retiroEnBase,
} from './soporte/cuentas-por-pagar-retiros.js';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, haceDias, primerDiaDelMes } from './soporte/escenario-de-documentos.js';
import { saldoDe } from './soporte/escenarios-de-bancos.js';
import { crearUsuarioConPermisos, darDeAltaCuenta } from './soporte/escenarios.js';
import { auditoriaDe, MODULOS_CON_CUENTAS_POR_PAGAR } from './soporte/ordenes-de-bancos.js';

const entorno = usarEntornoApi();
let e: EscenarioDePagos;
let soloVer: ClienteApi;
let sinPermisos: ClienteApi;

const idDelUsuario = async (nombres: string): Promise<string> =>
  (await consultar<{ id: string }>('select id from core.usuarios where nombres = $1', [nombres]))[0]!.id;

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxpretirosreg');
  const usuarioCon = (nombres: string, permisos: string[]) =>
    crearUsuarioConPermisos(entorno, e.mundo.escenario.cuenta, { nombres, apellidos: 'Retiros', permisos });
  soloVer = await usuarioCon('Solo mira retiros', ['cuentas-por-pagar.retiros.ver']);
  sinPermisos = await usuarioCon('Sin nada retiros', ['cuentas-por-pagar.pagos.ver']);
});

describe('el retiro con cheque', () => {
  it('queda abierto con su cheque en Bancos a nombre del custodio, no negociable, con el retiro como origen', async () => {
    const saldoAntes = await saldoDe(e.propietario(), e.cuentaBancariaId);

    const retiro = await registrarRetiro(e.propietario(), retiroConCheque(e, '1500.00'));

    expect(retiro).toMatchObject({
      forma: 'cheque',
      estado: 'abierto',
      monto: '1500.00',
      pagado: '0.00',
      disponible: '1500.00',
      custodio: 'Juan Pérez',
      custodioUsuarioId: null,
      puedeAnular: true,
      puedeLiquidar: true,
      puedeReabrir: false,
      pagos: [],
    });
    const cheque = await movimientoDelRetiro(retiro.movimiento.id);
    expect(cheque).toMatchObject({
      tipo: 'cheque',
      beneficiario: 'Juan Pérez',
      modulo: 'cuentas-por-pagar',
      origen: retiro.id,
      no_negociable: true,
    });
    expect(await conceptoDelMovimiento(retiro.movimiento.id)).toBe('efectivo_para_pagos');
    expect(Number(await saldoDe(e.propietario(), e.cuentaBancariaId))).toBe(Number(saldoAntes) - 1500);
  });

  it('el cheque se puede emitir a nombre de la empresa y apagar «no negociable»', async () => {
    const retiro = await registrarRetiro(
      e.propietario(),
      retiroConCheque(e, '200.00', { beneficiario: 'Rancho de Prueba, S.A.', noNegociable: false }),
    );

    expect(await movimientoDelRetiro(retiro.movimiento.id)).toMatchObject({
      beneficiario: 'Rancho de Prueba, S.A.',
      no_negociable: false,
    });
    expect(retiro.custodio).toBe('Juan Pérez');
  });

  it.each(['', '   ', 'Al Portador', ' AL  portador. ', 'Portador', 'al-portador'])(
    'rechaza el cheque a nombre de «%s» (al portador) sin guardar nada',
    async (beneficiario) => {
      const antes = await cuantosRetiros();

      const respuesta = await e.propietario().post(RUTA_DE_RETIROS, retiroConCheque(e, '100.00', { beneficiario }));

      expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBeGreaterThanOrEqual(400);
      expect(respuesta.cuerpo.error.codigo).toBe('beneficiario_del_retiro_invalido');
      expect(await cuantosRetiros()).toBe(antes);
    },
  );
});

describe('el retiro con nota de débito', () => {
  it('registra la nota de débito a nombre del custodio con la boleta como referencia', async () => {
    const retiro = await registrarRetiro(e.propietario(), retiroConNota(e, '800.00', { observaciones: 'Para fletes' }));

    expect(retiro).toMatchObject({ forma: 'nota_de_debito', estado: 'abierto', observaciones: 'Para fletes' });
    expect(await movimientoDelRetiro(retiro.movimiento.id)).toMatchObject({
      tipo: 'debito',
      beneficiario: 'Juan Pérez',
      referencia: 'BOL-123',
      origen: retiro.id,
    });
    expect(await conceptoDelMovimiento(retiro.movimiento.id)).toBe('efectivo_para_pagos');
  });
});

describe('lo que se rechaza sin guardar nada', () => {
  it('un retiro con fecha futura (posfechado)', async () => {
    const antes = await cuantosRetiros();

    for (const cuerpo of [
      retiroConCheque(e, '100.00', { fecha: haceDias(-3) }),
      retiroConNota(e, '100.00', { fecha: haceDias(-3) }),
    ]) {
      const respuesta = await e.propietario().post(RUTA_DE_RETIROS, cuerpo);
      expect(respuesta.cuerpo.error.codigo).toBe('fecha_de_retiro_invalida');
    }
    expect(await cuantosRetiros()).toBe(antes);
  });

  it('un monto en cero', async () => {
    const respuesta = await e.propietario().post(RUTA_DE_RETIROS, retiroConCheque(e, '0.00'));

    expect(respuesta.cuerpo.error.codigo).toBe('monto_de_retiro_invalido');
  });

  it('un retiro sin custodio', async () => {
    const respuesta = await e.propietario().post(RUTA_DE_RETIROS, retiroConCheque(e, '100.00', { custodio: null }));

    expect(respuesta.cuerpo.error.codigo).toBe('custodio_obligatorio');
  });

  it('un monto que la cuenta no cubre: Bancos lo rechaza y no queda ni el retiro ni el cheque', async () => {
    const antes = await cuantosRetiros();
    const cheques = async () =>
      (
        await consultar<{ total: string }>(
          "select count(*)::text as total from bancos.cheques where estado = 'emitido'",
        )
      )[0]!.total;
    const emitidosAntes = await cheques();

    const respuesta = await e.propietario().post(RUTA_DE_RETIROS, retiroConCheque(e, '900000.00'));

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBeGreaterThanOrEqual(400);
    expect(await cuantosRetiros()).toBe(antes);
    expect(await cheques()).toBe(emitidosAntes);
  });
});

describe('el custodio', () => {
  it('un usuario de la empresa: su nombre queda de custodio y su id en el retiro', async () => {
    await crearUsuarioConPermisos(entorno, e.mundo.escenario.cuenta, {
      nombres: 'Custodio Elegido',
      apellidos: 'Empresa',
      permisos: ['cuentas-por-pagar.retiros.ver'],
    });
    const usuarioId = await idDelUsuario('Custodio Elegido');

    const retiro = await registrarRetiro(
      e.propietario(),
      retiroConCheque(e, '300.00', { custodio: 'Otro nombre', custodioUsuarioId: usuarioId }),
    );

    expect(retiro).toMatchObject({ custodio: 'Custodio Elegido Empresa', custodioUsuarioId: usuarioId });
    expect(await movimientoDelRetiro(retiro.movimiento.id)).toMatchObject({ beneficiario: 'Custodio Elegido Empresa' });
    expect(await retiroEnBase(retiro.id)).toMatchObject({ custodio_usuario_id: usuarioId });
  });

  it('un usuario de otra empresa o que no existe no puede ser custodio', async () => {
    const otra = await darDeAltaCuenta(entorno, {
      nombre: 'Otra cuenta de retiros',
      usuario: 'cxpretirosotra',
      modulos: MODULOS_CON_CUENTAS_POR_PAGAR,
    });
    const antes = await cuantosRetiros();

    for (const custodioUsuarioId of [
      (await consultar<{ id: string }>('select id from core.usuarios where usuario = $1', [otra.usuario]))[0]!.id,
      crypto.randomUUID(),
    ]) {
      const respuesta = await e
        .propietario()
        .post(RUTA_DE_RETIROS, retiroConCheque(e, '100.00', { custodioUsuarioId }));
      expect(respuesta.cuerpo.error.codigo).toBe('custodio_invalido');
    }
    expect(await cuantosRetiros()).toBe(antes);
  });
});

describe('el aviso de fin de mes', () => {
  it('un retiro abierto de un mes anterior se avisa en la lista, en su ficha y al registrar otro', async () => {
    const viejo = await registrarRetiro(
      e.propietario(),
      retiroConCheque(e, '100.00', { fecha: primerDiaDelMes(-1), custodio: 'Ana López' }),
    );
    const esperado = `El retiro ${viejo.numero} es de ${primerDiaDelMes(-1).slice(5, 7)}/${primerDiaDelMes(-1).slice(0, 4)} y aún tiene Q100.00 sin usar: liquídelo o úselo; ese efectivo es de la empresa y está a cargo de Ana López.`;

    const nuevo = await registrarRetiro(e.propietario(), retiroConCheque(e, '50.00'));
    const ficha = await e.propietario().get(`${RUTA_DE_RETIROS}/${viejo.id}`);
    const lista = await e.propietario().get(RUTA_DE_RETIROS);

    expect(viejo).toMatchObject({ deMesAnterior: true });
    expect(viejo.avisos).toContain(esperado);
    expect(nuevo.avisos).toContain(esperado);
    expect(nuevo.deMesAnterior).toBe(false);
    expect(ficha.cuerpo.avisos).toContain(esperado);
    const fila = (lista.cuerpo.elementos as Array<{ id: string; deMesAnterior: boolean; aviso: string | null }>).find(
      ({ id }) => id === viejo.id,
    );
    expect(fila).toMatchObject({ deMesAnterior: true, aviso: esperado });
  });
});

describe('los permisos', () => {
  it('sin el permiso de cada acción responde 403 y nada se guarda', async () => {
    const antes = await cuantosRetiros();
    const id = crypto.randomUUID();
    const cuerpo = { motivo: 'Prueba' };

    const respuestas = [
      await soloVer.post(RUTA_DE_RETIROS, retiroConCheque(e, '100.00')),
      await sinPermisos.get(RUTA_DE_RETIROS),
      await sinPermisos.get(`${RUTA_DE_RETIROS}/${id}`),
      await soloVer.post(`${RUTA_DE_RETIROS}/${id}/anular`, cuerpo),
      await soloVer.post(`${RUTA_DE_RETIROS}/${id}/reabrir`, cuerpo),
      await soloVer.post(`${RUTA_DE_RETIROS}/${id}/liquidar`, { devuelto: '0.00', faltante: '0.00' }),
    ];

    for (const respuesta of respuestas) expect(respuesta.estado).toBe(403);
    expect(await cuantosRetiros()).toBe(antes);
  });

  it('con solo «ver» se lista y se lee la ficha', async () => {
    const retiro = await registrarRetiro(e.propietario(), retiroConCheque(e, '60.00'));

    const ficha = await soloVer.get(`${RUTA_DE_RETIROS}/${retiro.id}`);

    expect(ficha.estado).toBe(200);
    expect(ficha.cuerpo).toMatchObject({ id: retiro.id, monto: '60.00' });
    expect((await soloVer.get(RUTA_DE_RETIROS)).estado).toBe(200);
    expect(await auditoriaDe(retiro.id)).toEqual([]);
  });
});
