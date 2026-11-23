import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import {
  CodigoFueraDeLaMascara,
  ContabilidadSinIniciar,
  CuentaConHijas,
  CuentaInvalida,
  CuentaNoEsDeDetalle,
} from '../../../dominio/errores.js';
import { InicioContable } from '../../../dominio/inicio.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { CuentasEnMemoria } from '../../../pruebas/dobles-de-cuentas.js';
import { IniciosEnMemoria } from '../../../pruebas/dobles-de-inicio.js';
import type { SolicitudDeCuenta } from '../../dto/cuenta.dto.js';
import { ActualizarCuenta } from './actualizar-cuenta.js';
import { CrearCuenta } from './crear-cuenta.js';
import { EliminarCuenta } from './eliminar-cuenta.js';
import { ListarCuentas } from './listar-cuentas.js';
import { ObtenerCuenta } from './obtener-cuenta.js';

const operador = operadorDePrueba();

const solicitud = (cambios: Partial<SolicitudDeCuenta> = {}): SolicitudDeCuenta => ({
  codigo: '1',
  nombre: 'Activo',
  esDeDetalle: false,
  naturaleza: 'deudora',
  tipo: 'balance',
  rubro: null,
  corriente: false,
  claseDeFlujo: null,
  esMonetaria: false,
  pideTercero: false,
  pideCentroDeCosto: false,
  esDeControl: false,
  tratamientoFiscal: 'no_aplica',
  activo: true,
  ...cambios,
});

const caja = (cambios: Partial<SolicitudDeCuenta> = {}) =>
  solicitud({
    codigo: '1.1',
    nombre: 'Caja',
    esDeDetalle: true,
    rubro: 'efectivo',
    claseDeFlujo: 'efectivo',
    ...cambios,
  });

let auditoria: AuditoriaEnMemoria;
let inicios: IniciosEnMemoria;

function casosDeUso() {
  const registros = new CuentasEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  inicios = new IniciosEnMemoria();
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: registros,
    consultas: registros,
    inicios,
    auditoria,
  };
  return {
    listar: new ListarCuentas(dependencias),
    obtener: new ObtenerCuenta(dependencias),
    crear: new CrearCuenta(dependencias),
    actualizar: new ActualizarCuenta(dependencias),
    eliminar: new EliminarCuenta(dependencias),
  };
}

let casos: ReturnType<typeof casosDeUso>;

beforeEach(async () => {
  casos = casosDeUso();
  await inicios.agregar(
    InicioContable.crear(Identificador.desde(operador.empresaId), {
      fecha: '2026-01-01',
      caso: 'desde_la_carga',
      mascara: '9.9.99.99',
      plantilla: null,
      firmaRepresentante: null,
      firmaContador: null,
      registroDelContador: null,
    }),
  );
});

describe('crear cuentas', () => {
  it('registra una cuenta y aparece en la lista, con su nivel', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    expect(creado).toMatchObject({ codigo: '1', nivel: 1, padreId: null, padreCodigo: null });
    expect(await casos.listar.ejecutar(operador)).toEqual([creado]);
  });

  it('la cuenta superior sale del código', async () => {
    const raiz = await casos.crear.ejecutar(operador, solicitud());

    const hija = await casos.crear.ejecutar(operador, caja());

    expect(hija).toMatchObject({ nivel: 2, padreId: raiz.id, padreCodigo: '1' });
  });

  it('la lista sale por código, con las hijas bajo su cuenta superior', async () => {
    await casos.crear.ejecutar(operador, solicitud());
    await casos.crear.ejecutar(operador, solicitud({ codigo: '2', nombre: 'Pasivo', naturaleza: 'acreedora' }));
    await casos.crear.ejecutar(operador, caja());

    const codigos = (await casos.listar.ejecutar(operador)).map((cuenta) => cuenta.codigo);

    expect(codigos).toEqual(['1', '1.1', '2']);
  });

  it('exige iniciar la contabilidad antes', async () => {
    const sinInicio = casosDeUso();

    await expect(sinInicio.crear.ejecutar(operador, solicitud())).rejects.toThrow(ContabilidadSinIniciar);
  });

  it('rechaza un código fuera de la máscara', async () => {
    await expect(casos.crear.ejecutar(operador, solicitud({ codigo: '1.1.1' }))).rejects.toThrow(
      CodigoFueraDeLaMascara,
    );
  });

  it('rechaza una cuenta cuya superior no existe', async () => {
    await expect(casos.crear.ejecutar(operador, caja())).rejects.toThrow(CuentaInvalida);
  });

  it('no cuelga cuentas de una de detalle', async () => {
    await casos.crear.ejecutar(operador, solicitud());
    await casos.crear.ejecutar(operador, caja());

    const hija = solicitud({ codigo: '1.1.01', nombre: 'Hija' });

    await expect(casos.crear.ejecutar(operador, hija)).rejects.toThrow(CuentaNoEsDeDetalle);
  });

  it('no se registra sin nombre', async () => {
    await expect(casos.crear.ejecutar(operador, solicitud({ nombre: '  ' }))).rejects.toThrow(CuentaInvalida);
  });
});

describe('cambiar cuentas', () => {
  it('cambia sus datos', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const cambiado = await casos.actualizar.ejecutar(operador, {
      cuentaId: creado.id,
      solicitud: solicitud({ nombre: 'Activos' }),
    });

    expect(cambiado.nombre).toBe('Activos');
  });

  it('no cambia el código', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const cambio = casos.actualizar.ejecutar(operador, { cuentaId: creado.id, solicitud: solicitud({ codigo: '2' }) });

    await expect(cambio).rejects.toThrow(CuentaInvalida);
  });

  it('una cuenta con inferiores no pasa a ser de detalle ni cambia de tipo', async () => {
    const raiz = await casos.crear.ejecutar(operador, solicitud());
    await casos.crear.ejecutar(operador, caja());
    const aDetalle = solicitud({ esDeDetalle: true, rubro: 'efectivo', claseDeFlujo: 'efectivo' });
    const aResultados = solicitud({ tipo: 'resultados', rubro: 'otros_ingresos' });

    await expect(casos.actualizar.ejecutar(operador, { cuentaId: raiz.id, solicitud: aDetalle })).rejects.toThrow(
      CuentaConHijas,
    );
    await expect(casos.actualizar.ejecutar(operador, { cuentaId: raiz.id, solicitud: aResultados })).rejects.toThrow(
      CuentaInvalida,
    );
  });

  it('avisa si no existe o es de otra empresa', async () => {
    await expect(casos.obtener.ejecutar(operador, randomUUID())).rejects.toThrow(RecursoNoEncontrado);
  });

  it('se inactiva y se reactiva sin perder sus datos, con auditoría', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const inactiva = await casos.actualizar.ejecutar(operador, {
      cuentaId: creado.id,
      solicitud: solicitud({ activo: false }),
    });
    await casos.actualizar.ejecutar(operador, { cuentaId: creado.id, solicitud: solicitud() });

    expect(inactiva).toEqual({ ...creado, activo: false });
    expect(auditoria.acciones()).toEqual(['contabilidad.cuentas:inactivar', 'contabilidad.cuentas:reactivar']);
  });
});

describe('eliminar cuentas', () => {
  it('elimina una cuenta sin inferiores y deja la auditoría', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    await casos.eliminar.ejecutar(operador, creado.id);

    expect(await casos.listar.ejecutar(operador)).toEqual([]);
    expect(auditoria.acciones()).toEqual(['contabilidad.cuentas:eliminar']);
  });

  it('no elimina una cuenta con inferiores', async () => {
    const raiz = await casos.crear.ejecutar(operador, solicitud());
    await casos.crear.ejecutar(operador, caja());

    await expect(casos.eliminar.ejecutar(operador, raiz.id)).rejects.toThrow(CuentaConHijas);
    expect(auditoria.acciones()).toEqual([]);
  });
});
