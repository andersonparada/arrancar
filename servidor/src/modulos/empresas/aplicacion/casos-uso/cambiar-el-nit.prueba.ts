import { beforeEach, describe, expect, it } from 'vitest';
import { AccesoDenegado } from '../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import {
  AuditoriaEnMemoria,
  PublicadorEventosEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../core/compartido/pruebas/dobles-compartidos.js';
import { FaltaElMotivoDelCambioDeNit } from '../../dominio/cambio-de-nit.js';
import { AccesosEnMemoria, AvisosDeEmpresaEnMemoria, EmpresasEnMemoria } from '../../pruebas/dobles-de-empresas.js';
import { TiposDeLocalidadEnMemoria } from '../../pruebas/dobles-de-tipos-de-localidad.js';
import { AlcanceDelOperador } from '../alcance-del-operador.js';
import type { SolicitudDeEmpresa } from '../dto/empresa.dto.js';
import { ActualizarEmpresa } from './actualizar-empresa.js';
import { RegistrarEmpresa } from './registrar-empresa.js';
import { SembrarTiposDeLocalidad } from './tipos-de-localidad/sembrar-tipos-de-localidad.js';

let registrar: RegistrarEmpresa;
let actualizar: ActualizarEmpresa;
let auditoria: AuditoriaEnMemoria;
let propietario: Operador;

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
  const empresas = new EmpresasEnMemoria();
  const accesos = new AccesosEnMemoria();
  const unidadDeTrabajo = new UnidadDeTrabajoEnMemoria();
  const avisos = new AvisosDeEmpresaEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  propietario = operadorDePrueba();
  await accesos.darAcceso({ empresaId: propietario.empresaId, usuarioId: propietario.usuarioId });
  registrar = new RegistrarEmpresa({
    unidadDeTrabajo,
    repositorio: empresas,
    consultas: empresas,
    accesos,
    publicadorEventos: new PublicadorEventosEnMemoria(),
    tiposDeLocalidad: new SembrarTiposDeLocalidad(new TiposDeLocalidadEnMemoria()),
    avisos,
  });
  actualizar = new ActualizarEmpresa({
    unidadDeTrabajo,
    repositorio: empresas,
    consultas: empresas,
    alcance: new AlcanceDelOperador(accesos),
    auditoria,
    avisos,
  });
});

const conNit = () => registrar.ejecutar(propietario, solicitud({ nit: '12345679' }));

function cambiar(id: string, datos: Partial<SolicitudDeEmpresa>, extra: { puede?: boolean; motivo?: string } = {}) {
  return actualizar.ejecutar(propietario, {
    empresaId: id,
    solicitud: solicitud(datos),
    puedeCorregirNit: extra.puede ?? false,
    motivoDelNit: extra.motivo,
  });
}

describe('cambiar el NIT de una empresa (A-10)', () => {
  it('agregarlo no pide permiso ni motivo, pero deja rastro con el antes y el después', async () => {
    const empresa = await registrar.ejecutar(propietario, solicitud());

    await cambiar(empresa.id, { nit: '12345679' });

    expect(auditoria.entradas).toMatchObject([
      { accion: 'corregir', registroId: empresa.id, anterior: { nit: null, nitNuevo: '12345679' } },
    ]);
  });

  it('quitarlo sin el permiso se niega y no deja rastro', async () => {
    const empresa = await conNit();

    await expect(cambiar(empresa.id, { nit: null }, { motivo: 'Error' })).rejects.toThrow(AccesoDenegado);
    expect(auditoria.entradas).toEqual([]);
  });

  it('quitarlo o reemplazarlo sin motivo se niega', async () => {
    const empresa = await conNit();

    await expect(cambiar(empresa.id, { nit: null }, { puede: true })).rejects.toThrow(FaltaElMotivoDelCambioDeNit);
    await expect(cambiar(empresa.id, { nit: '1000002K' }, { puede: true, motivo: '  ' })).rejects.toThrow(
      FaltaElMotivoDelCambioDeNit,
    );
  });

  it('con permiso y motivo se quita y queda auditado con el NIT de antes', async () => {
    const empresa = await conNit();

    const guardada = await cambiar(empresa.id, { nit: null }, { puede: true, motivo: ' Se digitó mal ' });

    expect(guardada.nit).toBeNull();
    expect(auditoria.entradas).toMatchObject([
      { accion: 'corregir', motivo: 'Se digitó mal', anterior: { nit: '12345679', nitNuevo: null } },
    ]);
  });

  it('si el NIT no cambia no hay auditoría ni se pide nada', async () => {
    const empresa = await conNit();

    await cambiar(empresa.id, { nit: '12345679', nombre: 'Otro nombre' });

    expect(auditoria.entradas).toEqual([]);
  });
});
