import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { Bodega } from '../../../dominio/bodega.js';
import type { UsuarioConAcceso } from '../../puertos/consultas-de-accesos-a-bodegas.js';
import type { DependenciasDeBodegas } from './dependencias-de-bodegas.js';

interface AlGuardar {
  operador: Operador;
  bodega: Bodega;
  /** Los usuarios con acceso antes de guardar. */
  antes: UsuarioConAcceso[];
}

/**
 * Los accesos que aparecieron al guardar la bodega (el creador y el responsable, que los asignan disparadores de la
 * base de datos) quedan en la auditoría como `asignar`, con `aSiMismo` si el operador se lo dio a sí mismo.
 */
export async function auditarAsignacionesAlGuardar(
  { accesos, auditoria }: Pick<DependenciasDeBodegas, 'accesos' | 'auditoria'>,
  { operador, bodega, antes }: AlGuardar,
): Promise<void> {
  const { codigo, nombre } = bodega.instantanea();
  const bodegaId = bodega.id.valor;
  const nuevos = (await accesos.usuariosConAcceso(bodegaId)).filter(
    ({ usuarioId }) => !antes.some((previo) => previo.usuarioId === usuarioId),
  );
  for (const nuevo of nuevos) {
    const aSiMismo = nuevo.usuarioId === operador.usuarioId;
    await auditoria.registrar({
      recurso: 'inventarios.accesos-a-bodegas',
      registroId: bodegaId,
      accion: 'asignar',
      anterior: { ...nuevo, bodegaId, codigo, nombre, aSiMismo },
    });
  }
}
