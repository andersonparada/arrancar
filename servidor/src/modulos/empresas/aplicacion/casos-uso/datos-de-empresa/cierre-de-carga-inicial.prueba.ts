import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type {
  CifraDelCuadre,
  HallazgoDeCierre,
  RevisionDeCierreDeModulo,
} from '../../../../core/contratos/empresas.contratos.js';
import { Empresa } from '../../../dominio/empresa.js';
import {
  CargaInicialCerrada,
  FechaDeInicioRequerida,
  MotivoDeCierreInvalido,
  MotivoDeCierreRequerido,
  RevisionDeCierreDesactualizada,
} from '../../../dominio/errores.js';
import { AccesosEnMemoria, EmpresasEnMemoria } from '../../../pruebas/dobles-de-empresas.js';
import {
  CargasInicialesEnMemoria,
  ConsultasDeDatosDeEmpresaEnMemoria,
  DatosFiscalesEnMemoria,
} from '../../../pruebas/dobles-de-datos-de-empresa.js';
import { AlcanceDelOperador } from '../../alcance-del-operador.js';
import { EjecutorEnEmpresa } from '../../ejecutor-en-empresa.js';
import { CerrarCargaInicial } from './cerrar-carga-inicial.js';
import type { DependenciasDeDatosDeEmpresa } from './dependencias.js';
import { EstablecerFechaDeInicio } from './establecer-fecha-de-inicio.js';
import { RevisarCierreDeCargaInicial } from './revisar-cierre-de-carga-inicial.js';

let auditoria: AuditoriaEnMemoria;
let dependencias: DependenciasDeDatosDeEmpresa;
let operador: Operador;
let empresaId: string;
let respuestas: RevisionDeCierreDeModulo[];
let fallo: Error | null;
let preguntados: { empresaId: string; fechaDeInicio: string; operadorEmpresaId: string }[];

const hallazgo = (nivel: HallazgoDeCierre['nivel'], codigo = 'cosa'): HallazgoDeCierre => ({
  codigo,
  nivel,
  mensaje: `Mensaje de ${codigo}`,
  registro: null,
});
const cifra = (clave: string, valor = '10.00'): CifraDelCuadre => ({
  clave,
  etiqueta: clave,
  tipo: 'monto',
  valor,
  registro: null,
});
const modulo = (hallazgos: HallazgoDeCierre[] = [], cifras: CifraDelCuadre[] = []): RevisionDeCierreDeModulo => ({
  nombreDelModulo: 'Bancos',
  resumen: '2 cuentas',
  ruta: '/bancos/saldos-iniciales',
  hallazgos,
  cifras,
});

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
  respuestas = [];
  fallo = null;
  preguntados = [];
  const fiscales = new DatosFiscalesEnMemoria();
  const cargas = new CargasInicialesEnMemoria();
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
      cargaPorCerrar: async () => {},
      cargaPorReabrir: async () => {},
    },
    preguntas: {
      revisar: async (quien, datos) => {
        preguntados.push({ ...datos, operadorEmpresaId: quien.empresaId });
        if (fallo) throw fallo;
        return respuestas;
      },
    },
  };
});

const fijarFecha = (fechaDeInicio = '2026-01-01') =>
  new EstablecerFechaDeInicio(dependencias).ejecutar(operador, { empresaId, fechaDeInicio });
const revisar = () => new RevisarCierreDeCargaInicial(dependencias).ejecutar(operador, empresaId);
const cerrar = (opciones: { motivo?: string | null; huella?: string | null } = {}) =>
  new CerrarCargaInicial(dependencias).ejecutar(operador, { empresaId, ...opciones });

describe('revisar el cierre', () => {
  it('exige la fecha de inicio y que la carga esté abierta', async () => {
    await expect(revisar()).rejects.toThrow(FechaDeInicioRequerida);
    await fijarFecha();
    await cerrar();

    await expect(revisar()).rejects.toThrow(CargaInicialCerrada);
  });

  it('el bloque de la empresa va primero, con día 1 solo avisa del balance', async () => {
    await fijarFecha('2026-01-01');
    respuestas = [modulo([hallazgo('pide_motivo')], [cifra('total')])];

    const revision = await revisar();

    expect(revision.modulos.map((m) => m.nombreDelModulo)).toEqual(['Empresa', 'Bancos']);
    expect(revision.modulos[0]?.hallazgos.map((h) => h.codigo)).toEqual(['sin_balance_de_apertura']);
    expect(revision).toMatchObject({ diferencias: 1, avisos: 1, pideMotivo: true });
    expect(revision.huella).toMatch(/^[0-9a-f]{64}$/);
  });

  it('una fecha que no es día 1 agrega el aviso con el texto del dictamen', async () => {
    await fijarFecha('2026-03-15');

    const { modulos } = await revisar();

    expect(modulos[0]?.hallazgos[0]).toMatchObject({
      codigo: 'fecha_de_inicio_no_es_dia_1',
      nivel: 'aviso',
      mensaje: expect.stringContaining('La fecha de inicio (15/03/2026) no es el primer día de un mes.'),
    });
  });

  it('pregunta con la empresa de la carga, no la activa del operador', async () => {
    await fijarFecha('2026-01-01');

    await revisar();

    expect(preguntados).toEqual([{ empresaId, fechaDeInicio: '2026-01-01', operadorEmpresaId: empresaId }]);
  });

  it('un módulo con más de 200 cifras es un error de programación', async () => {
    await fijarFecha();
    respuestas = [
      modulo(
        [],
        Array.from({ length: 201 }, (_, i) => cifra(`c${i}`)),
      ),
    ];

    await expect(revisar()).rejects.toThrow(/máximo es 200/);
  });

  it('una empresa sin acceso responde como si no existiera', async () => {
    const ajeno = operadorDePrueba();

    await expect(new RevisarCierreDeCargaInicial(dependencias).ejecutar(ajeno, empresaId)).rejects.toThrow(
      RecursoNoEncontrado,
    );
  });
});

describe('cerrar con la revisión', () => {
  beforeEach(async () => {
    await fijarFecha();
  });

  it('sin hallazgos que pidan motivo cierra sin motivo y audita el cierre versionado', async () => {
    const carga = await cerrar();

    expect(carga).toMatchObject({ cerrada: true, cerradaPor: operador.usuarioId });
    expect(auditoria.entradas).toEqual([
      expect.objectContaining({
        recurso: 'empresas.cargas-iniciales',
        registroId: empresaId,
        accion: 'cerrar',
        motivo: null,
        anterior: expect.objectContaining({
          version: 1,
          carga: { empresaId, fechaDeInicio: '2026-01-01' },
          balanceDeApertura: null,
          revision: expect.objectContaining({ diferencias: 0, avisos: 1 }),
        }),
      }),
    ]);
  });

  it('con diferencias pide el motivo y lo deja en la revisión de la respuesta', async () => {
    respuestas = [modulo([hallazgo('pide_motivo', 'no_cuadra')])];

    const intento = cerrar();

    await expect(intento).rejects.toThrow(MotivoDeCierreRequerido);
    await expect(intento).rejects.toMatchObject({ detalles: expect.objectContaining({ diferencias: 1 }) });
    expect(auditoria.entradas).toEqual([]);
    expect((await new RevisarCierreDeCargaInicial(dependencias).ejecutar(operador, empresaId)).carga.cerrada).toBe(
      false,
    );
  });

  it('con diferencias y motivo cierra y audita el motivo, los hallazgos y las cifras', async () => {
    respuestas = [modulo([hallazgo('pide_motivo', 'no_cuadra')], [cifra('total_bancos', '500.00')])];

    await cerrar({ motivo: '  Banco aún no entrega el estado  ' });

    expect(auditoria.entradas[0]).toMatchObject({
      motivo: 'Banco aún no entrega el estado',
      anterior: {
        revision: {
          diferencias: 1,
          modulos: [
            expect.objectContaining({ nombreDelModulo: 'Empresa' }),
            expect.objectContaining({
              hallazgos: [expect.objectContaining({ codigo: 'no_cuadra' })],
              cifras: [expect.objectContaining({ clave: 'total_bancos', valor: '500.00' })],
            }),
          ],
        },
      },
    });
  });

  it('un motivo opcional también se audita', async () => {
    await cerrar({ motivo: 'Todo en orden' });

    expect(auditoria.entradas[0]?.motivo).toBe('Todo en orden');
  });

  it('rechaza un motivo de solo espacios o de más de 500 caracteres', async () => {
    await expect(cerrar({ motivo: '   ' })).rejects.toThrow(MotivoDeCierreInvalido);
    await expect(cerrar({ motivo: 'x'.repeat(501) })).rejects.toThrow(MotivoDeCierreInvalido);
    expect(auditoria.entradas).toEqual([]);
  });

  it('con la huella de lo que vio cierra; si los hallazgos cambiaron, se rechaza con la revisión nueva', async () => {
    const { huella } = await revisar();
    respuestas = [modulo([hallazgo('aviso')])];

    const intento = cerrar({ huella });

    await expect(intento).rejects.toThrow(RevisionDeCierreDesactualizada);
    await expect(intento).rejects.toMatchObject({ detalles: expect.objectContaining({ avisos: 2 }) });
    await expect(cerrar({ huella: (await revisar()).huella })).resolves.toMatchObject({ cerrada: true });
  });

  it('si solo cambian las cifras, la huella también cambia', async () => {
    respuestas = [modulo([], [cifra('total', '10.00')])];
    const { huella } = await revisar();
    respuestas = [modulo([], [cifra('total', '11.00')])];

    await expect(cerrar({ huella })).rejects.toThrow(RevisionDeCierreDesactualizada);
  });

  it('si un módulo falla, no cierra ni audita', async () => {
    fallo = new Error('el módulo no pudo revisar');

    await expect(cerrar()).rejects.toThrow('el módulo no pudo revisar');
    expect(auditoria.entradas).toEqual([]);
  });

  it('no se cierra dos veces ni sin fecha', async () => {
    await cerrar();

    await expect(cerrar()).rejects.toThrow(CargaInicialCerrada);
  });
});
