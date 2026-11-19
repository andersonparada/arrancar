import { and, asc, eq, sql } from 'drizzle-orm';
import { deLaTransaccion } from '../../../core/base-datos/columnas.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { empresaUsuarios } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { chequeras } from '../../../bancos/infraestructura/persistencia/chequeras.tablas.js';
import { cheques } from '../../../bancos/infraestructura/persistencia/cheques.tablas.js';
import { cuentasBancarias } from '../../../bancos/infraestructura/persistencia/cuentas-bancarias.tablas.js';
import { localidades } from '../../../empresas/infraestructura/persistencia/localidades.tablas.js';
import { conceptosDeGasto } from '../../../libro-de-compras/infraestructura/persistencia/conceptos-de-gasto.tablas.js';
import type { ChequeraParaElFondoDto, OpcionDeCatalogoDto } from '../../aplicacion/dto/catalogos.dto.js';
import type { ConsultasDeCatalogos } from '../../aplicacion/puertos/consultas-de-catalogos.js';

/**
 * Lee de Bancos, Empresas y Libro de compras (solo sus tablas, con su seguridad por empresa) y de Usuarios lo que Caja
 * chica ofrece para elegir; el permiso para entrar a la ruta lo pide la ruta, no el de esos módulos.
 */
export class ConsultasDeCatalogosDrizzle implements ConsultasDeCatalogos {
  cuentas(): Promise<OpcionDeCatalogoDto[]> {
    return transaccionEnCurso()
      .select({ id: cuentasBancarias.id, nombre: cuentasBancarias.nombre })
      .from(cuentasBancarias)
      .where(eq(cuentasBancarias.activo, true))
      .orderBy(asc(cuentasBancarias.nombre));
  }

  chequeras(): Promise<ChequeraParaElFondoDto[]> {
    return transaccionEnCurso()
      .select({
        id: chequeras.id,
        cuentaBancariaNombre: cuentasBancarias.nombre,
        serie: chequeras.serie,
        disponibles: sql<number>`count(${cheques.id}) filter (where ${cheques.estado} = 'disponible')::int`,
      })
      .from(chequeras)
      .innerJoin(cuentasBancarias, eq(cuentasBancarias.id, chequeras.cuentaBancariaId))
      .leftJoin(cheques, eq(cheques.chequeraId, chequeras.id))
      .where(and(eq(chequeras.activa, true), eq(chequeras.deApertura, false)))
      .groupBy(chequeras.id, cuentasBancarias.nombre)
      .orderBy(asc(cuentasBancarias.nombre), asc(chequeras.serie), asc(chequeras.desde));
  }

  localidades(): Promise<OpcionDeCatalogoDto[]> {
    return transaccionEnCurso()
      .select({ id: localidades.id, nombre: localidades.nombre })
      .from(localidades)
      .where(eq(localidades.activo, true))
      .orderBy(asc(localidades.nombre));
  }

  async usuarios(): Promise<OpcionDeCatalogoDto[]> {
    const filas = await transaccionEnCurso()
      .select({ id: usuarios.id, nombres: usuarios.nombres, apellidos: usuarios.apellidos })
      .from(empresaUsuarios)
      .innerJoin(usuarios, eq(usuarios.id, empresaUsuarios.usuarioId))
      .where(and(eq(empresaUsuarios.empresaId, deLaTransaccion.empresa()), eq(usuarios.activo, true)));
    return filas
      .map(({ id, nombres, apellidos }) => ({ id, nombre: `${nombres} ${apellidos}`.trim() }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  conceptosDeGasto(): Promise<OpcionDeCatalogoDto[]> {
    return transaccionEnCurso()
      .select({ id: conceptosDeGasto.id, nombre: conceptosDeGasto.nombre })
      .from(conceptosDeGasto)
      .where(eq(conceptosDeGasto.activo, true))
      .orderBy(asc(conceptosDeGasto.nombre));
  }
}
