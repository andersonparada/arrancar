import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import { NitInvalido } from '../../../core/compartido/dominio/objetos-valor/nit.js';
import {
  PublicadorEventosEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../core/compartido/pruebas/dobles-compartidos.js';
import { NoSePuedeDesactivarLaEmpresaEnUso } from '../../dominio/errores.js';
import { AccesosEnMemoria, EmpresasEnMemoria } from '../../pruebas/dobles-de-empresas.js';
import { AlcanceDelOperador } from '../alcance-del-operador.js';
import type { SolicitudDeEmpresa } from '../dto/empresa.dto.js';
import { ActualizarEmpresa } from './actualizar-empresa.js';
import { ListarEmpresas } from './listar-empresas.js';
import { ObtenerEmpresa } from './obtener-empresa.js';
import { RegistrarEmpresa } from './registrar-empresa.js';

const ROL_PROPIETARIO = 'rol-propietario';

let empresas: EmpresasEnMemoria;
let accesos: AccesosEnMemoria;
let publicadorEventos: PublicadorEventosEnMemoria;
let unidadDeTrabajo: UnidadDeTrabajoEnMemoria;
let propietario: Operador;
let casos: {
  registrar: RegistrarEmpresa;
  listar: ListarEmpresas;
  obtener: ObtenerEmpresa;
  actualizar: ActualizarEmpresa;
};

function solicitud(cambios: Partial<SolicitudDeEmpresa> = {}): SolicitudDeEmpresa {
  return {
    nombre: 'Parcela Los Pinos',
    nit: null,
    direccion: null,
    telefono: null,
    correo: null,
    activa: true,
    ...cambios,
  };
}

beforeEach(async () => {
  empresas = new EmpresasEnMemoria();
  accesos = new AccesosEnMemoria();
  publicadorEventos = new PublicadorEventosEnMemoria();
  unidadDeTrabajo = new UnidadDeTrabajoEnMemoria();
  const alcance = new AlcanceDelOperador(accesos);
  const consultas = empresas;
  casos = {
    registrar: new RegistrarEmpresa({ unidadDeTrabajo, repositorio: empresas, consultas, accesos, publicadorEventos }),
    listar: new ListarEmpresas({ unidadDeTrabajo, consultas, alcance }),
    obtener: new ObtenerEmpresa({ unidadDeTrabajo, consultas, alcance }),
    actualizar: new ActualizarEmpresa({ unidadDeTrabajo, repositorio: empresas, consultas, alcance }),
  };
  propietario = operadorDePrueba();
  await accesos.darAcceso({
    empresaId: propietario.empresaId,
    usuarioId: propietario.usuarioId,
    rolId: ROL_PROPIETARIO,
  });
});

describe('registrar una empresa', () => {
  it('quien la registra entra a ella con el mismo rol que tiene donde está trabajando', async () => {
    const empresa = await casos.registrar.ejecutar(propietario, solicitud());

    expect(await accesos.rolEnEmpresa(propietario.usuarioId, empresa.id)).toBe(ROL_PROPIETARIO);
  });

  it('soporte la registra sin volverse miembro', async () => {
    const soporte = operadorDePrueba({ cuentaId: propietario.cuentaId, esSuperacceso: true });

    const empresa = await casos.registrar.ejecutar(soporte, solicitud());

    expect(await accesos.rolEnEmpresa(soporte.usuarioId, empresa.id)).toBeNull();
  });

  it('trabaja dentro de una unidad de trabajo con el contexto del operador', async () => {
    await casos.registrar.ejecutar(propietario, solicitud());

    expect(unidadDeTrabajo.contextos).toEqual([propietario]);
  });

  it('publica que se registró, después de guardarla', async () => {
    await casos.registrar.ejecutar(propietario, solicitud());

    expect(publicadorEventos.nombres()).toEqual(['empresas.registrada']);
  });

  it('rechaza un NIT inválido sin guardar nada', async () => {
    await expect(casos.registrar.ejecutar(propietario, solicitud({ nit: '12345678' }))).rejects.toThrow(NitInvalido);
    expect(await empresas.listarDeCuenta(propietario.cuentaId)).toEqual([]);
  });
});

describe('ver empresas', () => {
  it('cada usuario ve solo las empresas de las que es miembro; soporte las ve todas', async () => {
    const soporte = operadorDePrueba({ cuentaId: propietario.cuentaId, esSuperacceso: true });
    await casos.registrar.ejecutar(soporte, solicitud({ nombre: 'Solo de soporte' }));
    await casos.registrar.ejecutar(propietario, solicitud({ nombre: 'Del propietario' }));

    const nombres = async (operador: Operador) => (await casos.listar.ejecutar(operador)).map((e) => e.nombre);

    expect(await nombres(propietario)).toEqual(['Del propietario']);
    expect(await nombres(soporte)).toEqual(['Del propietario', 'Solo de soporte']);
  });

  it('una empresa fuera de su alcance responde como si no existiera', async () => {
    const soporte = operadorDePrueba({ cuentaId: propietario.cuentaId, esSuperacceso: true });
    const ajena = await casos.registrar.ejecutar(soporte, solicitud());

    await expect(casos.obtener.ejecutar(propietario, ajena.id)).rejects.toThrow(RecursoNoEncontrado);
  });
});

describe('actualizar una empresa', () => {
  it('guarda los cambios y devuelve la empresa actualizada', async () => {
    const empresa = await casos.registrar.ejecutar(propietario, solicitud());

    const actualizada = await casos.actualizar.ejecutar(propietario, {
      empresaId: empresa.id,
      solicitud: solicitud({ nombre: 'Parcela El Mirador', nit: '12345679' }),
    });

    expect(actualizada).toMatchObject({ nombre: 'Parcela El Mirador', nit: '12345679' });
  });

  it('no deja desactivar la empresa con la que el operador está trabajando', async () => {
    const empresa = await casos.registrar.ejecutar(propietario, solicitud());
    const trabajandoEnElla = { ...propietario, empresaId: empresa.id };

    const desactivar = casos.actualizar.ejecutar(trabajandoEnElla, {
      empresaId: empresa.id,
      solicitud: solicitud({ activa: false }),
    });

    await expect(desactivar).rejects.toThrow(NoSePuedeDesactivarLaEmpresaEnUso);
  });

  it('no encuentra empresas de otra cuenta', async () => {
    const empresa = await casos.registrar.ejecutar(propietario, solicitud());
    const deOtraCuenta = operadorDePrueba({ esSuperacceso: true });

    const cambio = casos.actualizar.ejecutar(deOtraCuenta, { empresaId: empresa.id, solicitud: solicitud() });

    await expect(cambio).rejects.toThrow(RecursoNoEncontrado);
  });
});
