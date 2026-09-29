import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import { NitInvalido } from '../../../core/compartido/dominio/objetos-valor/nit.js';
import {
  AuditoriaEnMemoria,
  PublicadorEventosEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../core/compartido/pruebas/dobles-compartidos.js';
import { NoSePuedeDesactivarLaEmpresaEnUso } from '../../dominio/errores.js';
import { AccesosEnMemoria, EmpresasEnMemoria } from '../../pruebas/dobles-de-empresas.js';
import { TiposDeLocalidadEnMemoria } from '../../pruebas/dobles-de-tipos-de-localidad.js';
import { TIPOS_DE_LOCALIDAD_INICIALES } from '../../dominio/tipos-de-localidad-iniciales.js';
import { AlcanceDelOperador } from '../alcance-del-operador.js';
import type { SolicitudDeEmpresa } from '../dto/empresa.dto.js';
import { ActualizarEmpresa } from './actualizar-empresa.js';
import { ListarEmpresas } from './listar-empresas.js';
import { ObtenerEmpresa } from './obtener-empresa.js';
import { RegistrarEmpresa } from './registrar-empresa.js';
import { SembrarTiposDeLocalidad } from './tipos-de-localidad/sembrar-tipos-de-localidad.js';

let empresas: EmpresasEnMemoria;
let accesos: AccesosEnMemoria;
let tiposDeLocalidad: TiposDeLocalidadEnMemoria;
let publicadorEventos: PublicadorEventosEnMemoria;
let unidadDeTrabajo: UnidadDeTrabajoEnMemoria;
let auditoria: AuditoriaEnMemoria;
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
  tiposDeLocalidad = new TiposDeLocalidadEnMemoria();
  publicadorEventos = new PublicadorEventosEnMemoria();
  unidadDeTrabajo = new UnidadDeTrabajoEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  const alcance = new AlcanceDelOperador(accesos);
  const consultas = empresas;
  casos = {
    registrar: new RegistrarEmpresa({
      unidadDeTrabajo,
      repositorio: empresas,
      consultas,
      accesos,
      publicadorEventos,
      tiposDeLocalidad: new SembrarTiposDeLocalidad(tiposDeLocalidad),
    }),
    listar: new ListarEmpresas({ unidadDeTrabajo, consultas, alcance }),
    obtener: new ObtenerEmpresa({ unidadDeTrabajo, consultas, alcance }),
    actualizar: new ActualizarEmpresa({ unidadDeTrabajo, repositorio: empresas, consultas, alcance, auditoria }),
  };
  propietario = operadorDePrueba();
  await accesos.darAcceso({
    empresaId: propietario.empresaId,
    usuarioId: propietario.usuarioId,
  });
});

describe('registrar una empresa', () => {
  it('quien la registra entra a ella, porque ya es miembro de la empresa donde está trabajando', async () => {
    const empresa = await casos.registrar.ejecutar(propietario, solicitud());

    expect((await accesos.empresasDelUsuario(propietario.usuarioId)).has(empresa.id)).toBe(true);
  });

  it('soporte la registra sin volverse miembro', async () => {
    const soporte = operadorDePrueba({ cuentaId: propietario.cuentaId, esSuperacceso: true });

    const empresa = await casos.registrar.ejecutar(soporte, solicitud());

    expect((await accesos.empresasDelUsuario(soporte.usuarioId)).has(empresa.id)).toBe(false);
  });

  it('la registra con el contexto del operador y siembra sus tipos de localidad con la empresa nueva como activa', async () => {
    const empresa = await casos.registrar.ejecutar(propietario, solicitud());

    expect(unidadDeTrabajo.contextos).toEqual([propietario, { ...propietario, empresaId: empresa.id }]);
    expect((await tiposDeLocalidad.listar()).map((tipo) => tipo.nombre).sort()).toEqual(
      [...TIPOS_DE_LOCALIDAD_INICIALES].sort(),
    );
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
    expect(auditoria.entradas).toEqual([]);
  });

  it('desactivarla y reactivarla quedan en la auditoría', async () => {
    const empresa = await casos.registrar.ejecutar(propietario, solicitud());
    const cambiar = (activa: boolean) =>
      casos.actualizar.ejecutar(propietario, { empresaId: empresa.id, solicitud: solicitud({ activa }) });

    await cambiar(false);
    await cambiar(true);

    expect(auditoria.acciones()).toEqual(['empresas.empresas:inactivar', 'empresas.empresas:reactivar']);
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
