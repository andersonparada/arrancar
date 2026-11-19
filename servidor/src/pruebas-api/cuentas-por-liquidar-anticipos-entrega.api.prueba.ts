/**
 * Entregar un anticipo (CL-2): el cheque (a nombre del beneficiario, no negociable por omisión, nunca al portador) o la nota
 * de débito que Cuentas por liquidar ordena a Bancos con el anticipo como origen y el concepto «Anticipos por liquidar», la
 * fecha límite configurable, el aviso de facturas a nombre de la empresa (C8), lo que se rechaza sin guardar nada, el evento
 * y los permisos.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { busEventos } from '../modulos/core/eventos/bus-eventos.js';
import '../modulos/core/contratos/cuentas-por-liquidar.contratos.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import {
  anticipoEnBase,
  cuantosAnticipos,
  EscenarioDeAnticipos,
  movimientoDelAnticipo,
  RUTA_DE_ANTICIPOS,
} from './soporte/cuentas-por-liquidar-anticipos.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, haceDias, HOY } from './soporte/escenario-de-documentos.js';
import { saldoDe } from './soporte/escenarios-de-bancos.js';
import { crearUsuarioConPermisos, darDeAltaCuenta } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let e: EscenarioDeAnticipos;
let ana: string;
let sinPermisos: ClienteApi;
let soloVer: ClienteApi;

beforeAll(async () => {
  e = await EscenarioDeAnticipos.preparar(entorno, 'cxlentrega');
  ana = await e.tercero('Ana', 'López');
  const usuarioCon = (nombres: string, permisos: string[]) =>
    crearUsuarioConPermisos(entorno, e.cuenta, { nombres, apellidos: 'Anticipos', permisos });
  soloVer = await usuarioCon('Solo mira anticipos', ['cuentas-por-liquidar.anticipos.ver']);
  sinPermisos = await usuarioCon('Sin nada anticipos', ['cuentas-por-liquidar.reportes.ver']);
});

describe('el anticipo con cheque', () => {
  it('queda abierto con su cheque en Bancos a nombre del beneficiario, no negociable y con el anticipo como origen', async () => {
    const saldoAntes = await saldoDe(e.propietario(), e.cuentaBancariaId);

    const anticipo = await e.entregar(e.conCheque(ana, '1500.00', { clase: 'compra' }));

    expect(anticipo).toMatchObject({
      forma: 'cheque',
      estado: 'abierto',
      clase: 'compra',
      beneficiario: 'Ana López',
      esEmpleado: true,
      monto: '1500.00',
      gastado: '0.00',
      porJustificar: '1500.00',
      fecha: HOY,
      vencido: false,
      puedeAnular: true,
      puedeLiquidar: true,
      puedeReabrir: false,
      liquidacion: null,
      anulacion: null,
    });
    expect(await movimientoDelAnticipo(anticipo.movimiento.id)).toMatchObject({
      tipo: 'cheque',
      beneficiario: 'Ana López',
      modulo: 'cuentas-por-liquidar',
      origen: anticipo.id,
      no_negociable: true,
      clave: 'anticipo_por_liquidar',
    });
    expect(Number(await saldoDe(e.propietario(), e.cuentaBancariaId))).toBe(Number(saldoAntes) - 1500);
  });

  it('se puede apagar «no negociable»', async () => {
    const anticipo = await e.entregar(e.conCheque(ana, '100.00', { noNegociable: false }));

    expect((await movimientoDelAnticipo(anticipo.movimiento.id)).no_negociable).toBe(false);
  });

  it('el número es correlativo por empresa', async () => {
    const primero = await e.entregar(e.conCheque(ana, '10.00'));
    const segundo = await e.entregar(e.conCheque(ana, '10.00'));

    expect(Number(segundo.numero)).toBe(Number(primero.numero) + 1);
  });
});

describe('el anticipo con nota de débito', () => {
  it('registra la nota a nombre del beneficiario con la transferencia como referencia', async () => {
    const anticipo = await e.entregar(e.conNota(ana, '800.00', { esEmpleado: false }));

    expect(anticipo).toMatchObject({ forma: 'nota_de_debito', esEmpleado: false });
    expect(await movimientoDelAnticipo(anticipo.movimiento.id)).toMatchObject({
      tipo: 'debito',
      referencia: 'TRF-123',
      origen: anticipo.id,
      clave: 'anticipo_por_liquidar',
    });
  });
});

describe('la fecha límite', () => {
  it('por omisión son 15 días después de la entrega', async () => {
    const anticipo = await e.entregar(e.conCheque(ana, '20.00'));

    expect(anticipo.fechaLimite).toBe(haceDias(-15));
  });

  it('cambia con la configuración de la empresa y se puede escribir', async () => {
    const variable = 'cuentas-por-liquidar.anticipos.dias_para_liquidar';
    await entorno.soporte.put('/api/sesion/empresa-activa', { empresaId: e.cuenta.empresaId });
    const poner = await entorno.soporte.put(`/api/configuracion/${variable}`, { nivel: 'empresa', valor: 30 });
    expect(poner.estado, JSON.stringify(poner.cuerpo)).toBe(204);
    try {
      const configurado = await e.entregar(e.conCheque(ana, '20.00'));
      const escrito = await e.entregar(e.conCheque(ana, '20.00', { fechaLimite: haceDias(-3) }));

      expect(configurado.fechaLimite).toBe(haceDias(-30));
      expect(escrito.fechaLimite).toBe(haceDias(-3));
    } finally {
      await entorno.soporte.delete(`/api/configuracion/${variable}?nivel=empresa`);
    }
  });
});

describe('el aviso de las facturas a nombre de la empresa (C8)', () => {
  it('solo sale cuando el beneficiario no es empleado', async () => {
    const aviso = 'Las facturas deben venir a nombre y NIT de la empresa.';

    const externo = await e.entregar(e.conCheque(ana, '30.00', { esEmpleado: false }));
    const empleado = await e.entregar(e.conCheque(ana, '30.00'));

    expect(externo.avisos).toContain(aviso);
    expect(empleado.avisos).not.toContain(aviso);
  });
});

describe('lo que se rechaza sin guardar nada', () => {
  const rechaza = async (cuerpo: Record<string, unknown>, codigo: string) => {
    const antes = await cuantosAnticipos();
    const respuesta = await e.propietario().post(RUTA_DE_ANTICIPOS, cuerpo);
    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBeGreaterThanOrEqual(400);
    expect(respuesta.cuerpo.error.codigo).toBe(codigo);
    expect(await cuantosAnticipos()).toBe(antes);
  };

  it('una fecha futura (posfechado) y un monto en cero', async () => {
    await rechaza(e.conCheque(ana, '100.00', { fecha: haceDias(-3) }), 'fecha_del_anticipo_invalida');
    await rechaza(e.conCheque(ana, '0.00'), 'monto_del_anticipo_invalido');
  });

  it('una fecha límite anterior a la entrega', async () => {
    await rechaza(e.conCheque(ana, '100.00', { fechaLimite: haceDias(2) }), 'fecha_limite_invalida');
  });

  it('un beneficiario que no existe o es de otra cuenta', async () => {
    await rechaza(e.conCheque(crypto.randomUUID(), '100.00'), 'beneficiario_no_disponible');
    const otra = await darDeAltaCuenta(entorno, {
      nombre: 'Otra cuenta de anticipos',
      usuario: 'cxlotracuenta',
      modulos: ['terceros'],
    });
    const ajeno = await otra.propietario.post('/api/terceros', {
      tipo: 'individual',
      nombres: 'Luis',
      apellidos: 'Ajeno',
    });
    await rechaza(e.conCheque(ajeno.cuerpo.id, '100.00'), 'beneficiario_no_disponible');
  });

  it('un tercero inactivo', async () => {
    const inactivo = await e.tercero('Inés', 'Inactiva');
    await consultar('update terceros.terceros set activo = false where id = $1', [inactivo]);

    await rechaza(e.conCheque(inactivo, '100.00'), 'beneficiario_no_disponible');
  });

  it('un usuario que no entra a la empresa y una localidad que no es de ella', async () => {
    await rechaza(
      e.conCheque(ana, '10.00', { beneficiarioUsuarioId: crypto.randomUUID() }),
      'beneficiario_usuario_invalido',
    );
    await rechaza(e.conCheque(ana, '10.00', { localidadId: crypto.randomUUID() }), 'localidad_del_anticipo_invalida');
  });

  it('una chequera que no existe: Bancos rechaza y no queda nada', async () => {
    const antes = await cuantosAnticipos();

    const respuesta = await e
      .propietario()
      .post(RUTA_DE_ANTICIPOS, e.conCheque(ana, '10.00', { chequeraId: crypto.randomUUID() }));

    expect(respuesta.estado).toBeGreaterThanOrEqual(400);
    expect(await cuantosAnticipos()).toBe(antes);
  });

  it('datos incompletos', async () => {
    const respuesta = await e.propietario().post(RUTA_DE_ANTICIPOS, { forma: 'cheque', chequeraId: e.chequeraId });

    expect(respuesta.estado).toBe(400);
  });
});

describe('el evento y la ficha', () => {
  it('publica anticipo_entregado con el monto en centavos', async () => {
    const eventos: Array<{ montoCentavos: number; beneficiario: string }> = [];
    const baja = busEventos.suscribir('cuentas-por-liquidar.anticipo_entregado', (datos) => {
      eventos.push(datos);
    });

    await e.entregar(e.conCheque(ana, '12.34'));
    baja();

    expect(eventos).toMatchObject([{ montoCentavos: 1234, beneficiario: 'Ana López' }]);
  });

  it('guarda a quién se entregó, si es empleado y el plazo', async () => {
    const anticipo = await e.entregar(e.conCheque(ana, '40.00'));

    expect(await anticipoEnBase(anticipo.id)).toMatchObject({
      estado: 'abierto',
      beneficiario: 'Ana López',
      es_empleado: true,
      motivo_con_vencidos: null,
    });
  });
});

describe('los permisos', () => {
  it('entregar exige anticipos.crear', async () => {
    for (const cliente of [soloVer, sinPermisos]) {
      const respuesta = await cliente.post(RUTA_DE_ANTICIPOS, e.conCheque(ana, '10.00'));
      expect(respuesta.estado).toBe(403);
    }
  });
});
