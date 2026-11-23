import { beforeEach, describe, expect, it } from 'vitest';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Empresa } from '../../../dominio/empresa.js';
import { AccesosEnMemoria, EmpresasEnMemoria } from '../../../pruebas/dobles-de-empresas.js';
import {
  CargasInicialesEnMemoria,
  ConsultasDeDatosDeEmpresaEnMemoria,
  DatosFiscalesEnMemoria,
} from '../../../pruebas/dobles-de-datos-de-empresa.js';
import type { CambioDeLaCarga } from '../../puertos/avisos-de-empresa.js';
import { AlcanceDelOperador } from '../../alcance-del-operador.js';
import { EjecutorEnEmpresa } from '../../ejecutor-en-empresa.js';
import { CerrarCargaInicial } from './cerrar-carga-inicial.js';
import type { DependenciasDeDatosDeEmpresa } from './dependencias.js';
import { EstablecerFechaDeInicio } from './establecer-fecha-de-inicio.js';
import { ReabrirCargaInicial } from './reabrir-carga-inicial.js';

let auditoria: AuditoriaEnMemoria;
let dependencias: DependenciasDeDatosDeEmpresa;
let avisos: Array<['cerrar' | 'reabrir', CambioDeLaCarga, string | null]>;
let fallo: Error | null;
let operador: Operador;
let empresaId: string;

beforeEach(async () => {
  const empresas = new EmpresasEnMemoria();
  const accesos = new AccesosEnMemoria();
  const unidadDeTrabajo = new UnidadDeTrabajoEnMemoria();
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
  avisos = [];
  fallo = null;
  const fiscales = new DatosFiscalesEnMemoria();
  const cargas = new CargasInicialesEnMemoria();
  const avisar = (quien: 'cerrar' | 'reabrir') => async (sesion: Operador, aviso: CambioDeLaCarga) => {
    avisos.push([quien, aviso, sesion.empresaId]);
    if (fallo) throw fallo;
  };
  dependencias = {
    unidadDeTrabajo,
    ejecutorEnEmpresa: new EjecutorEnEmpresa({
      unidadDeTrabajo,
      consultas: empresas,
      alcance: new AlcanceDelOperador(accesos),
    }),
    repositorioFiscales: fiscales,
    repositorioCargas: cargas,
    consultas: new ConsultasDeDatosDeEmpresaEnMemoria(fiscales, cargas, new Map([[empresaId, 'Rancho El Quiroa']])),
    auditoria,
    avisos: {
      fechaDeInicioPorCambiar: async () => {},
      cargaPorCerrar: avisar('cerrar'),
      cargaPorReabrir: avisar('reabrir'),
    },
    preguntas: { revisar: async () => [] },
  };
});

const fijarFecha = (fechaDeInicio: string) =>
  new EstablecerFechaDeInicio(dependencias).ejecutar(operador, { empresaId, fechaDeInicio });
const cerrar = () => new CerrarCargaInicial(dependencias).ejecutar(operador, { empresaId });
const reabrir = () => new ReabrirCargaInicial(dependencias).ejecutar(operador, { empresaId, motivo: 'Faltó un saldo' });

describe('avisos de la carga inicial', () => {
  it('cerrar avisa carga_por_cerrar y reabrir carga_por_reabrir, con la empresa de la carga y su fecha', async () => {
    await fijarFecha('2026-03-01');
    await cerrar();
    await reabrir();

    const aviso = { empresaId, fechaDeInicio: '2026-03-01' };
    expect(avisos).toEqual([
      ['cerrar', aviso, empresaId],
      ['reabrir', aviso, empresaId],
    ]);
  });

  it('si el que escucha lanza su error al cerrar, el error sale y no se audita el cierre', async () => {
    await fijarFecha('2026-03-01');
    fallo = new Error('apertura con diferencias');

    await expect(cerrar()).rejects.toThrow('apertura con diferencias');
    expect(auditoria.entradas.some((entrada) => entrada.accion === 'cerrar')).toBe(false);
  });

  it('si el que escucha lanza su error al reabrir, el error sale y no se audita la reapertura', async () => {
    await fijarFecha('2026-03-01');
    await cerrar();
    fallo = new Error('período cerrado');

    await expect(reabrir()).rejects.toThrow('período cerrado');
    expect(auditoria.entradas.some((entrada) => entrada.accion === 'reabrir')).toBe(false);
  });
});
