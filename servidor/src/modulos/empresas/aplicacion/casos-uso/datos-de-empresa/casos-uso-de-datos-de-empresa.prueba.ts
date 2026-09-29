import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Empresa } from '../../../dominio/empresa.js';
import {
  CargaInicialAbierta,
  CargaInicialCerrada,
  FechaDeInicioInvalida,
  FechaDeInicioRequerida,
  MotivoDeReaperturaInvalido,
  RazonSocialInvalida,
} from '../../../dominio/errores.js';
import { AccesosEnMemoria, EmpresasEnMemoria } from '../../../pruebas/dobles-de-empresas.js';
import {
  CargasInicialesEnMemoria,
  ConsultasDeDatosDeEmpresaEnMemoria,
  DatosFiscalesEnMemoria,
} from '../../../pruebas/dobles-de-datos-de-empresa.js';
import { AlcanceDelOperador } from '../../alcance-del-operador.js';
import { EjecutorEnEmpresa } from '../../ejecutor-en-empresa.js';
import { AtenderOrdenesDeDatosDeEmpresa } from './atender-ordenes-de-datos-de-empresa.js';
import { CerrarCargaInicial } from './cerrar-carga-inicial.js';
import type { DependenciasDeDatosDeEmpresa } from './dependencias.js';
import { EstablecerFechaDeInicio } from './establecer-fecha-de-inicio.js';
import { GuardarDatosFiscales } from './guardar-datos-fiscales.js';
import { ObtenerCargaInicial } from './obtener-carga-inicial.js';
import { ObtenerDatosFiscales } from './obtener-datos-fiscales.js';
import { ReabrirCargaInicial } from './reabrir-carga-inicial.js';

let unidadDeTrabajo: UnidadDeTrabajoEnMemoria;
let auditoria: AuditoriaEnMemoria;
let consultas: ConsultasDeDatosDeEmpresaEnMemoria;
let dependencias: DependenciasDeDatosDeEmpresa;
let operador: Operador;
let empresaId: string;

beforeEach(async () => {
  const empresas = new EmpresasEnMemoria();
  const accesos = new AccesosEnMemoria();
  unidadDeTrabajo = new UnidadDeTrabajoEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  operador = operadorDePrueba();
  const empresa = Empresa.registrar(Identificador.desde<'Cuenta'>(operador.cuentaId), {
    nombre: 'Rancho El Quiroa',
    nit: null,
    direccion: null,
    telefono: null,
    correo: null,
    activa: true,
  });
  empresaId = empresa.id.valor;
  await empresas.agregar(empresa);
  await accesos.darAcceso({ empresaId, usuarioId: operador.usuarioId });

  const fiscales = new DatosFiscalesEnMemoria();
  const cargas = new CargasInicialesEnMemoria();
  consultas = new ConsultasDeDatosDeEmpresaEnMemoria(fiscales, cargas, new Map([[empresaId, 'Rancho El Quiroa']]));
  dependencias = {
    unidadDeTrabajo,
    ejecutorEnEmpresa: new EjecutorEnEmpresa({
      unidadDeTrabajo,
      consultas: empresas,
      alcance: new AlcanceDelOperador(accesos),
    }),
    repositorioFiscales: fiscales,
    repositorioCargas: cargas,
    consultas,
    auditoria,
  };
});

const fijarFecha = (fechaDeInicio = '2026-01-01') =>
  new EstablecerFechaDeInicio(dependencias).ejecutar(operador, { empresaId, fechaDeInicio });
const cerrar = () => new CerrarCargaInicial(dependencias).ejecutar(operador, empresaId);
const reabrir = (motivo = 'Faltó un saldo') =>
  new ReabrirCargaInicial(dependencias).ejecutar(operador, { empresaId, motivo });

describe('datos fiscales', () => {
  it('sin guardar nada devuelve la razón social y el nombre comercial en blanco', async () => {
    const datos = await new ObtenerDatosFiscales(dependencias).ejecutar(operador, empresaId);

    expect(datos).toEqual({ empresaId, razonSocial: null, nombreComercial: null });
  });

  it('guarda la primera vez y corrige después, sin espacios sobrantes', async () => {
    const guardar = new GuardarDatosFiscales(dependencias);
    await guardar.ejecutar(operador, {
      empresaId,
      solicitud: { razonSocial: 'Ganadera Quiroa, S. A.', nombreComercial: null },
    });

    const corregidos = await guardar.ejecutar(operador, {
      empresaId,
      solicitud: { razonSocial: '  Ganadera El Quiroa, S. A.  ', nombreComercial: 'El Quiroa' },
    });

    expect(corregidos).toEqual({
      empresaId,
      razonSocial: 'Ganadera El Quiroa, S. A.',
      nombreComercial: 'El Quiroa',
    });
  });

  it('rechaza una razón social de más de 200 caracteres', async () => {
    const guardar = new GuardarDatosFiscales(dependencias).ejecutar(operador, {
      empresaId,
      solicitud: { razonSocial: 'x'.repeat(201), nombreComercial: null },
    });

    await expect(guardar).rejects.toThrow(RazonSocialInvalida);
  });

  it('trabaja con la empresa pedida como contexto de seguridad, aunque no sea la activa', async () => {
    await new ObtenerDatosFiscales(dependencias).ejecutar(operador, empresaId);

    expect(unidadDeTrabajo.contextos).toEqual([{ ...operador, empresaId }]);
  });

  it('una empresa de otra cuenta o sin acceso responde como si no existiera', async () => {
    const deOtraCuenta = operadorDePrueba();
    const sinAcceso = operadorDePrueba({ cuentaId: operador.cuentaId });
    const obtener = new ObtenerDatosFiscales(dependencias);

    await expect(obtener.ejecutar(deOtraCuenta, empresaId)).rejects.toThrow(RecursoNoEncontrado);
    await expect(obtener.ejecutar(sinAcceso, empresaId)).rejects.toThrow(RecursoNoEncontrado);
  });
});

describe('fecha de inicio', () => {
  it('sin registrar devuelve la carga sin fecha y abierta', async () => {
    const carga = await new ObtenerCargaInicial(dependencias).ejecutar(operador, empresaId);

    expect(carga).toMatchObject({ fechaDeInicio: null, cerrada: false, cerradaEn: null, cerradaPor: null });
  });

  it('se registra y se corrige mientras la carga está abierta', async () => {
    await fijarFecha('2026-01-01');

    const corregida = await fijarFecha('2026-02-01');

    expect(corregida).toMatchObject({ fechaDeInicio: '2026-02-01', cerrada: false });
  });

  it('rechaza una fecha que no existe', async () => {
    await expect(fijarFecha('2026-02-30')).rejects.toThrow(FechaDeInicioInvalida);
  });

  it('con la carga cerrada ya no se puede cambiar', async () => {
    await fijarFecha();
    await cerrar();

    await expect(fijarFecha('2026-03-01')).rejects.toThrow(CargaInicialCerrada);
  });
});

describe('cerrar la carga inicial', () => {
  it('anota quién y cuándo', async () => {
    await fijarFecha();

    const carga = await cerrar();

    expect(carga).toMatchObject({ fechaDeInicio: '2026-01-01', cerrada: true, cerradaPor: operador.usuarioId });
    expect(carga.cerradaEn).toBeInstanceOf(Date);
  });

  it('exige que ya esté registrada la fecha de inicio', async () => {
    await expect(cerrar()).rejects.toThrow(FechaDeInicioRequerida);
  });

  it('no se cierra dos veces', async () => {
    await fijarFecha();
    await cerrar();

    await expect(cerrar()).rejects.toThrow(CargaInicialCerrada);
  });
});

describe('reabrir la carga inicial', () => {
  it('la deja abierta y queda en la auditoría con el motivo y cómo estaba', async () => {
    await fijarFecha();
    await cerrar();

    const carga = await reabrir('  Faltó un saldo de bancos  ');

    expect(carga).toMatchObject({ fechaDeInicio: '2026-01-01', cerrada: false, cerradaEn: null });
    expect(auditoria.entradas).toEqual([
      expect.objectContaining({
        recurso: 'empresas.cargas-iniciales',
        registroId: empresaId,
        accion: 'reabrir',
        motivo: 'Faltó un saldo de bancos',
        anterior: expect.objectContaining({ cerrada: true, fechaDeInicio: '2026-01-01' }),
      }),
    ]);
  });

  it('después de reabrirla se puede corregir la fecha', async () => {
    await fijarFecha();
    await cerrar();
    await reabrir();

    const carga = await fijarFecha('2026-03-01');

    expect(carga.fechaDeInicio).toBe('2026-03-01');
  });

  it('exige el motivo y no deja rastro si falta', async () => {
    await fijarFecha();
    await cerrar();

    await expect(reabrir('   ')).rejects.toThrow(MotivoDeReaperturaInvalido);
    expect(auditoria.entradas).toEqual([]);
  });

  it('no hay nada que reabrir si la carga está abierta o no existe', async () => {
    await expect(reabrir()).rejects.toThrow(CargaInicialAbierta);
    await fijarFecha();
    await expect(reabrir()).rejects.toThrow(CargaInicialAbierta);
  });
});

describe('órdenes del mediador', () => {
  it('la carga inicial se lee con bloqueo compartido y sin datos del cierre', async () => {
    await fijarFecha();
    await cerrar();

    const respuesta = await new AtenderOrdenesDeDatosDeEmpresa(dependencias).obtenerCargaInicial(operador, empresaId);

    expect(respuesta).toEqual({ fechaDeInicio: '2026-01-01', cerrada: true });
    expect(consultas.lecturasConBloqueo).toBe(1);
  });

  it('los datos de la empresa traen el nombre, el NIT y los datos fiscales', async () => {
    await new GuardarDatosFiscales(dependencias).ejecutar(operador, {
      empresaId,
      solicitud: { razonSocial: 'Ganadera Quiroa, S. A.', nombreComercial: null },
    });

    const datos = await new AtenderOrdenesDeDatosDeEmpresa(dependencias).obtenerDatosDeEmpresa(operador, empresaId);

    expect(datos).toEqual({
      nombre: 'Rancho El Quiroa',
      nit: null,
      razonSocial: 'Ganadera Quiroa, S. A.',
      nombreComercial: null,
    });
  });
});
