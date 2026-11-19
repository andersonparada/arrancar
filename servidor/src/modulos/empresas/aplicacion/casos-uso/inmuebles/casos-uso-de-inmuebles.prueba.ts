import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { InmuebleInvalido } from '../../../dominio/inmueble.js';
import { InmueblesEnMemoria } from '../../../pruebas/dobles-de-inmuebles.js';
import type { SolicitudDeInmueble } from '../../dto/inmueble.dto.js';
import { ActualizarInmueble } from './actualizar-inmueble.js';
import { CrearInmueble } from './crear-inmueble.js';
import { EliminarInmueble } from './eliminar-inmueble.js';
import { InactivarInmueble } from './inactivar-inmueble.js';
import { ListarInmuebles } from './listar-inmuebles.js';
import { ObtenerInmueble } from './obtener-inmueble.js';
import { ReactivarInmueble } from './reactivar-inmueble.js';

const operador = operadorDePrueba();

/** Un inmueble inscrito de la empresa, sin copropiedad ni escritura. */
const solicitudDeInmueble = (cambios: Partial<SolicitudDeInmueble> = {}): SolicitudDeInmueble => ({
  nombre: 'Finca El Carmen',
  situacionRegistral: 'inscrito',
  registro: 'general',
  numeroDeFinca: '1234',
  folio: '56',
  libro: '345E',
  departamentoRegistral: '05',
  documentoPosesorio: null,
  titulacionSupletoriaEnTramite: false,
  titularidad: 'propia',
  porcentajeDeCopropiedad: null,
  titular: null,
  matriculaFiscal: null,
  administraIusi: null,
  codigoCatastral: null,
  departamentoCodigo: null,
  municipioCodigo: null,
  direccion: null,
  superficieRegistralM2: null,
  cantidadOriginal: null,
  unidadOriginal: null,
  varasPorLadoDeCuerda: null,
  localidadId: null,
  observaciones: null,
  ...cambios,
});

let auditoria: AuditoriaEnMemoria;

function casosDeUso() {
  const registros = new InmueblesEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: registros,
    consultas: registros,
    auditoria,
  };
  return {
    listar: new ListarInmuebles(dependencias),
    obtener: new ObtenerInmueble(dependencias),
    crear: new CrearInmueble(dependencias),
    actualizar: new ActualizarInmueble(dependencias),
    inactivar: new InactivarInmueble(dependencias),
    reactivar: new ReactivarInmueble(dependencias),
    eliminar: new EliminarInmueble(dependencias),
  };
}

let casos: ReturnType<typeof casosDeUso>;

beforeEach(() => {
  casos = casosDeUso();
});

describe('inmuebles', () => {
  it('registra un inmueble activo y aparece en la lista', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitudDeInmueble());

    expect(creado.activo).toBe(true);
    expect(await casos.listar.ejecutar(operador)).toEqual([creado]);
  });

  it('cambia sus datos sin tocar su estado', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitudDeInmueble());
    await casos.inactivar.ejecutar(operador, creado.id);

    const cambiado = await casos.actualizar.ejecutar(operador, {
      inmuebleId: creado.id,
      solicitud: solicitudDeInmueble({ nombre: 'Finca cambiada' }),
    });

    expect(cambiado).toMatchObject({ nombre: 'Finca cambiada', activo: false });
  });

  it('avisa si no existe o es de otra empresa', async () => {
    await expect(casos.obtener.ejecutar(operador, randomUUID())).rejects.toThrow(RecursoNoEncontrado);
    await expect(casos.eliminar.ejecutar(operador, randomUUID())).rejects.toThrow(RecursoNoEncontrado);
  });

  it('no se registra con datos que rompen las reglas del dominio', async () => {
    const invalido = casos.crear.ejecutar(operador, solicitudDeInmueble({ nombre: '  ' }));

    await expect(invalido).rejects.toThrow(InmuebleInvalido);
  });
});

describe('inactivar, reactivar y eliminar un inmueble', () => {
  it('se inactiva y se reactiva dejando rastro en la auditoría', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitudDeInmueble());

    const inactivo = await casos.inactivar.ejecutar(operador, creado.id);
    const reactivado = await casos.reactivar.ejecutar(operador, creado.id);

    expect([inactivo.activo, reactivado.activo]).toEqual([false, true]);
    expect(auditoria.acciones()).toEqual(['empresas.inmuebles:inactivar', 'empresas.inmuebles:reactivar']);
  });

  it('no audita si el inmueble ya estaba en ese estado', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitudDeInmueble());

    await casos.reactivar.ejecutar(operador, creado.id);

    expect(auditoria.acciones()).toEqual([]);
  });

  it('se elimina y deja su rastro en la auditoría', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitudDeInmueble());

    await casos.eliminar.ejecutar(operador, creado.id);

    expect(await casos.listar.ejecutar(operador)).toEqual([]);
    expect(auditoria.acciones()).toEqual(['empresas.inmuebles:eliminar']);
  });
});
