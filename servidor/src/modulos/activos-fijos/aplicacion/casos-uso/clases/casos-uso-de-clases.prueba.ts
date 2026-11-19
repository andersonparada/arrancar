import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { ClaseInvalido } from '../../../dominio/clase.js';
import { CLASES_SUGERIDAS } from '../../../dominio/clases-iniciales.js';
import { ClaseConPorcentajeSobreElMaximo, ClaseEnUso } from '../../../dominio/errores.js';
import { ClasesEnMemoria, RelacionEnMemoria, TopesFijos } from '../../../pruebas/dobles-de-clases.js';
import type { SolicitudDeClase } from '../../dto/clase.dto.js';
import { ActualizarClase } from './actualizar-clase.js';
import { CrearClase } from './crear-clase.js';
import { EliminarClase } from './eliminar-clase.js';
import { ListarClases } from './listar-clases.js';
import { ListarConceptosDeClase } from './listar-conceptos-de-clase.js';
import { ObtenerClase } from './obtener-clase.js';
import { ReemplazarConceptosDeClase } from './reemplazar-conceptos-de-clase.js';

const operador = operadorDePrueba();
const VEHICULOS = randomUUID();
const COMBUSTIBLES = randomUUID();
const MUEBLES = randomUUID();

const solicitud = (cambios: Partial<SolicitudDeClase> = {}): SolicitudDeClase => ({
  nombre: 'Registro de prueba',
  incisoFiscal: 'edificios',
  porcentajeFiscal: '5.00',
  vidaUtilContableMeses: 240,
  valorResidualPorcentaje: '10.00',
  activo: true,
  ...cambios,
});

let auditoria: AuditoriaEnMemoria;
let registros: ClasesEnMemoria;
let relacion: RelacionEnMemoria;

function casosDeUso(topes = new TopesFijos()) {
  registros = new ClasesEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  relacion = new RelacionEnMemoria({ [VEHICULOS]: 'Vehículos', [COMBUSTIBLES]: 'Combustibles', [MUEBLES]: 'Muebles' });
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: registros,
    consultas: registros,
    auditoria,
    topes,
    relacion,
  };
  return {
    listar: new ListarClases(dependencias),
    obtener: new ObtenerClase(dependencias),
    crear: new CrearClase(dependencias),
    actualizar: new ActualizarClase(dependencias),
    eliminar: new EliminarClase(dependencias),
    listarConceptos: new ListarConceptosDeClase(dependencias),
    reemplazarConceptos: new ReemplazarConceptosDeClase(dependencias),
  };
}

let casos: ReturnType<typeof casosDeUso>;

beforeEach(() => {
  casos = casosDeUso();
});

describe('clases de activos', () => {
  it('registra una clase de activo y aparece en la lista (sin sembrar la sugerida, porque la empresa ya tiene una)', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const lista = await casos.listar.ejecutar(operador);

    expect(lista).toEqual([creado]);
  });

  it('cambia sus datos', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const cambiado = await casos.actualizar.ejecutar(operador, {
      claseId: creado.id,
      solicitud: solicitud({ nombre: 'Registro cambiado' }),
    });

    expect(cambiado.nombre).toBe('Registro cambiado');
  });

  it('avisa si no existe o es de otra empresa', async () => {
    await expect(casos.obtener.ejecutar(operador, randomUUID())).rejects.toThrow(RecursoNoEncontrado);
  });

  it('no se registra sin "Nombre"', async () => {
    const invalido = casos.crear.ejecutar(operador, solicitud({ nombre: '  ' }));

    await expect(invalido).rejects.toThrow(ClaseInvalido);
  });

  it('se inactiva sin perder sus datos y queda en la auditoría', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const inactivo = await casos.actualizar.ejecutar(operador, {
      claseId: creado.id,
      solicitud: solicitud({ activo: false }),
    });

    expect(inactivo).toEqual({ ...creado, activo: false });
    expect(auditoria.acciones()).toEqual(['activos-fijos.clases:inactivar']);
  });
});

describe('máximo de ley del inciso', () => {
  it('no deja crear una clase con porcentaje sobre el máximo de la configuración', async () => {
    const invalido = casos.crear.ejecutar(operador, solicitud({ porcentajeFiscal: '5.01' }));

    await expect(invalido).rejects.toThrow(ClaseConPorcentajeSobreElMaximo);
  });

  it('tampoco al editar, y respeta el tope que la instalación haya cambiado', async () => {
    const con = casosDeUso(new TopesFijos({ edificios: 8 }));
    const creado = await con.crear.ejecutar(operador, solicitud({ porcentajeFiscal: '8.00' }));

    const sobre = con.actualizar.ejecutar(operador, {
      claseId: creado.id,
      solicitud: solicitud({ porcentajeFiscal: '8.01' }),
    });

    await expect(sobre).rejects.toThrow(ClaseConPorcentajeSobreElMaximo);
  });
});

describe('lista sugerida', () => {
  it('al listar una empresa sin clases se le siembran las 14 y no se vuelven a agregar', async () => {
    const primera = await casos.listar.ejecutar(operador);
    const segunda = await casos.listar.ejecutar(operador);

    expect(primera).toHaveLength(CLASES_SUGERIDAS.length);
    expect(segunda).toEqual(primera);
  });

  it('si la empresa ya tiene clases no se le siembra nada', async () => {
    await casos.crear.ejecutar(operador, solicitud());

    expect(await casos.listar.ejecutar(operador)).toHaveLength(1);
  });

  it('si la instalación bajó el tope, la sugerida no lo pasa', async () => {
    const con = casosDeUso(new TopesFijos({ edificios: 3 }));

    const lista = await con.listar.ejecutar(operador);

    expect(lista.find((clase) => clase.nombre === 'Edificios')?.porcentajeFiscal).toBe('3.00');
  });
});

describe('eliminar', () => {
  it('elimina una clase sin nada ligado y deja su auditoría', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    await casos.eliminar.ejecutar(operador, creado.id);

    await expect(casos.obtener.ejecutar(operador, creado.id)).rejects.toThrow(RecursoNoEncontrado);
    expect(auditoria.acciones()).toEqual(['activos-fijos.clases:eliminar']);
  });

  it('no elimina una clase con algo ligado: se inactiva', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());
    registros.ligadas.add(creado.id);

    await expect(casos.eliminar.ejecutar(operador, creado.id)).rejects.toThrow(ClaseEnUso);
    expect(auditoria.acciones()).toEqual([]);
  });
});

describe('conceptos de gasto que proponen la clase', () => {
  it('fija la lista y la devuelve por nombre', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const lista = await casos.reemplazarConceptos.ejecutar(operador, {
      claseId: creado.id,
      conceptoIds: [VEHICULOS, COMBUSTIBLES, VEHICULOS],
    });

    expect(lista.map((concepto) => concepto.nombre)).toEqual(['Combustibles', 'Vehículos']);
    expect(await casos.listarConceptos.ejecutar(operador, creado.id)).toEqual(lista);
  });

  it('los que faltan en la lista nuevos dejan de proponerla y quedan en la auditoría', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());
    await casos.reemplazarConceptos.ejecutar(operador, { claseId: creado.id, conceptoIds: [VEHICULOS, MUEBLES] });

    const lista = await casos.reemplazarConceptos.ejecutar(operador, { claseId: creado.id, conceptoIds: [MUEBLES] });

    expect(lista.map((concepto) => concepto.conceptoDeGastoId)).toEqual([MUEBLES]);
    expect(auditoria.acciones()).toEqual(['activos-fijos.clases-por-concepto:quitar']);
  });

  it('un concepto que ya proponía otra clase pasa a esta y la otra relación queda en la auditoría', async () => {
    const una = await casos.crear.ejecutar(operador, solicitud({ nombre: 'Una' }));
    const otra = await casos.crear.ejecutar(operador, solicitud({ nombre: 'Otra' }));
    await casos.reemplazarConceptos.ejecutar(operador, { claseId: una.id, conceptoIds: [VEHICULOS] });

    await casos.reemplazarConceptos.ejecutar(operador, { claseId: otra.id, conceptoIds: [VEHICULOS] });

    expect(await casos.listarConceptos.ejecutar(operador, una.id)).toEqual([]);
    expect(await casos.listarConceptos.ejecutar(operador, otra.id)).toHaveLength(1);
    expect(auditoria.acciones()).toEqual(['activos-fijos.clases-por-concepto:quitar']);
  });

  it('avisa si un concepto no existe o si la clase no existe', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    await expect(
      casos.reemplazarConceptos.ejecutar(operador, { claseId: creado.id, conceptoIds: [randomUUID()] }),
    ).rejects.toThrow(RecursoNoEncontrado);
    await expect(
      casos.reemplazarConceptos.ejecutar(operador, { claseId: randomUUID(), conceptoIds: [] }),
    ).rejects.toThrow(RecursoNoEncontrado);
  });
});
