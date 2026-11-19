import { and, eq } from 'drizzle-orm';
import { exigirQueExista } from '../../../core/compartido/infraestructura/exigir-que-exista.js';
import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { empresaUsuarios } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { cuentasBancarias } from '../../../bancos/infraestructura/persistencia/cuentas-bancarias.tablas.js';
import { movimientos } from '../../../bancos/infraestructura/persistencia/movimientos.tablas.js';
import { localidades } from '../../../empresas/infraestructura/persistencia/localidades.tablas.js';
import type {
  CustodiosDeFondos,
  MovimientosDeFondos,
  ReferenciasDeFondos,
} from '../../aplicacion/puertos/puertos-de-fondos.js';

/** Lee de `core` (el módulo puede importar de core): el usuario debe estar activo y entrar a la empresa del contexto. */
export class CustodiosDeFondosDrizzle implements CustodiosDeFondos {
  async nombreDelUsuario(usuarioId: string): Promise<string | null> {
    const { empresaId } = contextoEnCurso();
    const [fila] = await transaccionEnCurso()
      .select({ nombres: usuarios.nombres, apellidos: usuarios.apellidos })
      .from(usuarios)
      .innerJoin(empresaUsuarios, eq(empresaUsuarios.usuarioId, usuarios.id))
      .where(and(eq(usuarios.id, usuarioId), eq(usuarios.activo, true), eq(empresaUsuarios.empresaId, empresaId)));
    return fila ? `${fila.nombres} ${fila.apellidos}`.trim() : null;
  }
}

/** La seguridad por filas oculta lo de otra empresa o cuenta, así que tampoco se puede apuntar a ello. */
export class ReferenciasDeFondosDrizzle implements ReferenciasDeFondos {
  exigirLocalidad(localidadId: string | null | undefined): Promise<void> {
    return exigirQueExista(localidades, localidadId ?? null, 'La localidad');
  }

  exigirCuentaBancaria(cuentaBancariaId: string | null | undefined): Promise<void> {
    return exigirQueExista(cuentasBancarias, cuentaBancariaId ?? null, 'La cuenta bancaria');
  }
}

/** Lo que Caja chica lee de los movimientos de Bancos sin orden (el módulo depende de Bancos). */
export class MovimientosDeFondosDrizzle implements MovimientosDeFondos {
  async fechaDe(movimientoId: string): Promise<string | null> {
    const [fila] = await transaccionEnCurso()
      .select({ fecha: movimientos.fecha })
      .from(movimientos)
      .where(eq(movimientos.id, movimientoId));
    return fila?.fecha ?? null;
  }
}
