import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Localidad } from '../../../dominio/localidad.js';
import { datosDeLocalidad } from '../../datos-de-localidad.js';
import type { MiembroDeLaEmpresa } from '../../dto/accesos-a-localidades.dto.js';
import type { AsignacionDeLocalidad, AsignacionesDeLocalidades } from '../../puertos/asignaciones-de-localidades.js';
import { LocalidadesEnMemoria } from '../../../pruebas/dobles-de-localidades.js';
import { ListarUsuariosParaAccesos } from './listar-usuarios-para-accesos.js';
import { ReemplazarAccesosDeUsuario } from './reemplazar-accesos-de-usuario.js';

const operador = operadorDePrueba();
const trabajador: MiembroDeLaEmpresa = { usuarioId: 'u-1', usuario: 'trabajador', nombres: 'T', apellidos: 'A' };
const yo: MiembroDeLaEmpresa = { usuarioId: operador.usuarioId, usuario: 'yo', nombres: 'Y', apellidos: 'O' };

class AsignacionesEnMemoria implements AsignacionesDeLocalidades {
  readonly accesos: AsignacionDeLocalidad[] = [];
  readonly miembrosDeLaEmpresa = [trabajador, yo];

  async miembros() {
    return this.miembrosDeLaEmpresa;
  }
  async miembro(usuarioId: string) {
    return this.miembrosDeLaEmpresa.find((m) => m.usuarioId === usuarioId) ?? null;
  }
  async todas() {
    return this.accesos;
  }
  async localidadIdsDelUsuario(usuarioId: string) {
    return this.accesos.filter((a) => a.usuarioId === usuarioId).map((a) => a.localidadId);
  }
  async asignar(asignacion: AsignacionDeLocalidad) {
    this.accesos.push(asignacion);
  }
  async quitar({ usuarioId, localidadId }: AsignacionDeLocalidad) {
    const indice = this.accesos.findIndex((a) => a.usuarioId === usuarioId && a.localidadId === localidadId);
    this.accesos.splice(indice, 1);
  }
}

let asignaciones: AsignacionesEnMemoria;
let auditoria: AuditoriaEnMemoria;
let localidadIds: string[];
let dependencias: ConstructorParameters<typeof ReemplazarAccesosDeUsuario>[0];

beforeEach(async () => {
  const registros = new LocalidadesEnMemoria();
  localidadIds = [];
  for (const n of [1, 2]) {
    const localidad = Localidad.crear(
      Identificador.desde(operador.empresaId),
      datosDeLocalidad({
        codigo: `L-${n}`,
        nombre: `Localidad ${n}`,
        tipoId: '00000000-0000-4000-8000-000000000001',
        codigoEstablecimientoSat: null,
        nombreComercialSat: null,
        departamentoCodigo: null,
        municipioCodigo: null,
        direccion: null,
        activo: true,
      }),
    );
    await registros.agregar(localidad);
    localidadIds.push(localidad.id.valor);
  }
  asignaciones = new AsignacionesEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    auditoria,
    consultas: registros,
    asignaciones,
    permisosDeUsuario: {
      enCuenta: async (usuarioId) => ({
        roles: [{ rolId: 'r', nombre: 'Rol', accesoTotal: usuarioId === trabajador.usuarioId, permisos: [] }],
        directos: [],
      }),
    },
  };
});

describe('ReemplazarAccesosDeUsuario', () => {
  it('asigna lo nuevo, quita lo que sobra y audita cada cambio', async () => {
    const reemplazar = new ReemplazarAccesosDeUsuario(dependencias);
    await reemplazar.ejecutar(operador, { usuarioId: trabajador.usuarioId, localidadIds: [localidadIds[0]!] });
    await reemplazar.ejecutar(operador, { usuarioId: trabajador.usuarioId, localidadIds: [localidadIds[1]!] });

    expect(asignaciones.accesos).toEqual([{ usuarioId: trabajador.usuarioId, localidadId: localidadIds[1] }]);
    expect(auditoria.entradas.map((e) => e.accion)).toEqual(['asignar', 'asignar', 'quitar']);
    expect(auditoria.entradas[2]?.anterior).toMatchObject({ codigo: 'L-1', aSiMismo: false });
  });

  it('marca aSiMismo cuando el operador se asigna a sí mismo', async () => {
    await new ReemplazarAccesosDeUsuario(dependencias).ejecutar(operador, {
      usuarioId: yo.usuarioId,
      localidadIds: [localidadIds[0]!, localidadIds[0]!],
    });

    expect(asignaciones.accesos).toHaveLength(1);
    expect(auditoria.entradas[0]?.anterior).toMatchObject({ aSiMismo: true });
  });

  it('un usuario ajeno o una localidad inexistente se rechazan sin escribir', async () => {
    const reemplazar = new ReemplazarAccesosDeUsuario(dependencias);

    await expect(reemplazar.ejecutar(operador, { usuarioId: 'ajeno', localidadIds: [] })).rejects.toThrow(
      RecursoNoEncontrado,
    );
    await expect(
      reemplazar.ejecutar(operador, { usuarioId: yo.usuarioId, localidadIds: [localidadIds[0]!, 'no-existe'] }),
    ).rejects.toThrow(RecursoNoEncontrado);
    expect(asignaciones.accesos).toEqual([]);
    expect(auditoria.entradas).toEqual([]);
  });
});

describe('ListarUsuariosParaAccesos', () => {
  it('trae sus roles y si ya ven todas', async () => {
    const usuarios = await new ListarUsuariosParaAccesos(dependencias).ejecutar(operador);

    expect(usuarios.map((u) => [u.usuario, u.veTodas, u.roles])).toEqual([
      ['trabajador', true, ['Rol']],
      ['yo', false, ['Rol']],
    ]);
  });
});
