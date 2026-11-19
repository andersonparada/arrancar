import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Bodega } from '../../../dominio/bodega.js';
import { datosDeBodega } from '../../datos-de-bodega.js';
import type { MiembroDeLaEmpresa } from '../../dto/accesos-a-bodegas.dto.js';
import type { AsignacionDeBodega, AsignacionesDeBodegas } from '../../puertos/asignaciones-de-bodegas.js';
import { BodegasEnMemoria } from '../../../pruebas/dobles-de-bodegas.js';
import { ListarUsuariosParaAccesos } from './listar-usuarios-para-accesos.js';
import { ReemplazarAccesosDeUsuario } from './reemplazar-accesos-de-usuario.js';

const operador = operadorDePrueba();
const trabajador: MiembroDeLaEmpresa = { usuarioId: 'u-1', usuario: 'trabajador', nombres: 'T', apellidos: 'A' };
const yo: MiembroDeLaEmpresa = { usuarioId: operador.usuarioId, usuario: 'yo', nombres: 'Y', apellidos: 'O' };

class AsignacionesEnMemoria implements AsignacionesDeBodegas {
  readonly accesos: AsignacionDeBodega[] = [];
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
  async bodegaIdsDelUsuario(usuarioId: string) {
    return this.accesos.filter((a) => a.usuarioId === usuarioId).map((a) => a.bodegaId);
  }
  async asignar(asignacion: AsignacionDeBodega) {
    this.accesos.push(asignacion);
  }
  async quitar({ usuarioId, bodegaId }: AsignacionDeBodega) {
    const indice = this.accesos.findIndex((a) => a.usuarioId === usuarioId && a.bodegaId === bodegaId);
    this.accesos.splice(indice, 1);
  }
}

let asignaciones: AsignacionesEnMemoria;
let auditoria: AuditoriaEnMemoria;
let bodegaIds: string[];
let dependencias: ConstructorParameters<typeof ReemplazarAccesosDeUsuario>[0];

beforeEach(async () => {
  const registros = new BodegasEnMemoria();
  bodegaIds = [];
  for (const n of [1, 2]) {
    const bodega = Bodega.crear(
      Identificador.desde(operador.empresaId),
      datosDeBodega({
        codigo: `B-${n}`,
        nombre: `Bodega ${n}`,
        localidadId: null,
        responsable: null,
        responsableUsuarioId: null,
        activo: true,
      }),
    );
    await registros.agregar(bodega);
    bodegaIds.push(bodega.id.valor);
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
    await reemplazar.ejecutar(operador, { usuarioId: trabajador.usuarioId, bodegaIds: [bodegaIds[0]!] });
    await reemplazar.ejecutar(operador, { usuarioId: trabajador.usuarioId, bodegaIds: [bodegaIds[1]!] });

    expect(asignaciones.accesos).toEqual([{ usuarioId: trabajador.usuarioId, bodegaId: bodegaIds[1] }]);
    expect(auditoria.entradas.map((e) => e.accion)).toEqual(['asignar', 'asignar', 'quitar']);
    expect(auditoria.entradas[2]?.anterior).toMatchObject({ codigo: 'B-1', aSiMismo: false });
  });

  it('marca aSiMismo cuando el operador se asigna a sí mismo', async () => {
    await new ReemplazarAccesosDeUsuario(dependencias).ejecutar(operador, {
      usuarioId: yo.usuarioId,
      bodegaIds: [bodegaIds[0]!, bodegaIds[0]!],
    });

    expect(asignaciones.accesos).toHaveLength(1);
    expect(auditoria.entradas[0]?.anterior).toMatchObject({ aSiMismo: true });
  });

  it('un usuario ajeno o una bodega inexistente se rechazan sin escribir', async () => {
    const reemplazar = new ReemplazarAccesosDeUsuario(dependencias);

    await expect(reemplazar.ejecutar(operador, { usuarioId: 'ajeno', bodegaIds: [] })).rejects.toThrow(
      RecursoNoEncontrado,
    );
    await expect(
      reemplazar.ejecutar(operador, { usuarioId: yo.usuarioId, bodegaIds: [bodegaIds[0]!, 'no-existe'] }),
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
