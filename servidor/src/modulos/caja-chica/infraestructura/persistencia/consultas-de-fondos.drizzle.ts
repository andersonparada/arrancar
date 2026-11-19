import { and, asc, count, eq, inArray, type SQL } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { cuentasBancarias } from '../../../bancos/infraestructura/persistencia/cuentas-bancarias.tablas.js';
import { localidades } from '../../../empresas/infraestructura/persistencia/localidades.tablas.js';
import type { ConsultasDeFondos, DatosDeLectura, FiltroDeFondos } from '../../aplicacion/puertos/puertos-de-fondos.js';
import type { Fondo, UsoDelFondo } from '../../dominio/fondos.js';
import {
  aperturasAnuladasDe,
  custodiosVigentesDe,
  montosDe,
  pendientesDe,
  ultimosArqueosDe,
  usoDe,
  valesAbiertosDe,
  valesMasViejosDe,
} from './cifras-de-fondos.drizzle.js';
import { fondos } from './fondos.tablas.js';
import { aFondo } from './repositorio-de-fondos.drizzle.js';

interface Fuentes {
  montos: Map<string, number>;
  anuladas: Set<string>;
  pendientes: Map<string, number>;
  vales: Map<string, number>;
  valesViejos: Map<string, string>;
  arqueados: Map<string, string>;
  custodios: Awaited<ReturnType<typeof custodiosVigentesDe>>;
  nombres: Map<string, string>;
  cuentas: Map<string, string>;
}

const total = (totales: Map<string, number>, id: string): number => totales.get(id) ?? 0;

/** Lo de un fondo sacado de cada consulta agrupada. */
function datosDe(id: string, fuentes: Fuentes): DatosDeLectura {
  const custodio = fuentes.custodios.get(id);
  return {
    custodio: custodio?.custodio ?? null,
    custodioUsuarioId: custodio?.usuarioId ?? null,
    localidadNombre: fuentes.nombres.get(id) ?? null,
    cuentaBancariaNombre: fuentes.cuentas.get(id) ?? null,
    montoCentavos: total(fuentes.montos, id),
    pendienteCentavos: total(fuentes.pendientes, id),
    valesCentavos: total(fuentes.vales, id),
    valeMasViejo: fuentes.valesViejos.get(id) ?? null,
    ultimoArqueo: fuentes.arqueados.get(id) ?? null,
    aperturaAnulada: fuentes.anuladas.has(id),
  };
}

/** Las consultas de lectura de los fondos; las tablas tienen seguridad por empresa y por el alcance de fondos (RLS). */
export class ConsultasDeFondosDrizzle implements ConsultasDeFondos {
  async listar(filtro: FiltroDeFondos): Promise<{ filas: Fondo[]; total: number }> {
    const condiciones: SQL[] = [];
    if (filtro.estado !== 'todos') condiciones.push(eq(fondos.estado, filtro.estado));
    if (filtro.localidadId) condiciones.push(eq(fondos.localidadId, filtro.localidadId));
    const donde = and(...condiciones);
    const bd = transaccionEnCurso();
    const [filas, [total]] = await Promise.all([
      bd
        .select()
        .from(fondos)
        .where(donde)
        .orderBy(asc(fondos.nombre), asc(fondos.id))
        .limit(filtro.limite)
        .offset((filtro.pagina - 1) * filtro.limite),
      bd.select({ total: count() }).from(fondos).where(donde),
    ]);
    return { filas: filas.map(aFondo), total: total?.total ?? 0 };
  }

  async datosDeLectura(ids: readonly string[]): Promise<Map<string, DatosDeLectura>> {
    if (ids.length === 0) return new Map();
    const fuentes: Fuentes = {
      montos: await montosDe(ids),
      anuladas: await aperturasAnuladasDe(ids),
      pendientes: await pendientesDe(ids),
      vales: await valesAbiertosDe(ids),
      valesViejos: await valesMasViejosDe(ids),
      arqueados: await ultimosArqueosDe(ids),
      custodios: await custodiosVigentesDe(ids),
      nombres: await this.nombresDeLocalidad(ids),
      cuentas: await this.nombresDeCuenta(ids),
    };
    return new Map(ids.map((id) => [id, datosDe(id, fuentes)]));
  }

  usoDelFondo(id: string): Promise<UsoDelFondo> {
    return usoDe(id);
  }

  private async nombresDeLocalidad(ids: readonly string[]): Promise<Map<string, string>> {
    const filas = await transaccionEnCurso()
      .select({ fondoId: fondos.id, nombre: localidades.nombre })
      .from(fondos)
      .innerJoin(localidades, eq(localidades.id, fondos.localidadId))
      .where(inArray(fondos.id, [...ids]));
    return new Map(filas.map(({ fondoId, nombre }) => [fondoId, nombre]));
  }

  private async nombresDeCuenta(ids: readonly string[]): Promise<Map<string, string>> {
    const filas = await transaccionEnCurso()
      .select({ fondoId: fondos.id, nombre: cuentasBancarias.nombre })
      .from(fondos)
      .innerJoin(cuentasBancarias, eq(cuentasBancarias.id, fondos.cuentaBancariaId))
      .where(inArray(fondos.id, [...ids]));
    return new Map(filas.map(({ fondoId, nombre }) => [fondoId, nombre]));
  }
}
