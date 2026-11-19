import { and, asc, desc, eq, getTableColumns, ilike, or, sql, type AnyColumn, type SQL } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  ActivoDto,
  ActivoFichaDto,
  FiltrosDeActivos,
  TramoDto,
  TrasladoDto,
} from '../../aplicacion/dto/activo.dto.js';
import type { ConsultasActivos } from '../../aplicacion/puertos/consultas-activos.js';
import { activos } from './activos.tablas.js';
import { clases } from './clases.tablas.js';
import { costos } from './costos.tablas.js';
import { nombresDeUbicaciones } from './nombres-de-ubicaciones.js';
import { tramos } from './tramos.tablas.js';
import { traslados } from './traslados.tablas.js';
import { UbicacionesEnEmpresas } from './ubicaciones-en-empresas.drizzle.js';

const COMODINES = /[\\%_]/g;
const contiene = (texto: string) => `%${texto.trim().replace(COMODINES, '\\$&')}%`;

/** Filtros que se resuelven con una igualdad sobre su columna. */
const IGUALDADES = {
  estado: activos.estado,
  claseId: activos.claseId,
  tipoDeRegistro: activos.tipoDeRegistro,
  localidadId: activos.localidadId,
  departamentoId: activos.departamentoId,
  ocioso: activos.ocioso,
  enBodega: activos.enBodega,
} as const;

/** Condiciones de la lista; cada filtro presente suma una. */
function condiciones(filtros: FiltrosDeActivos): SQL[] {
  const iguales = (Object.keys(IGUALDADES) as (keyof typeof IGUALDADES)[]).flatMap((clave) =>
    filtros[clave] === undefined ? [] : [eq(IGUALDADES[clave] as AnyColumn, filtros[clave])],
  );
  const parecidos = [
    filtros.responsable ? ilike(activos.responsable, contiene(filtros.responsable)) : undefined,
    filtros.texto?.trim() ? buscarEnTextos(contiene(filtros.texto)) : undefined,
  ];
  return [...iguales, ...parecidos.filter((condicion): condicion is SQL => condicion !== undefined)];
}

function buscarEnTextos(buscado: string): SQL | undefined {
  return or(
    ilike(activos.codigo, buscado),
    ilike(activos.descripcion, buscado),
    ilike(activos.numeroDeSerie, buscado),
    ilike(activos.placa, buscado),
  );
}

/** Σ de los costos vigentes del activo (no se guarda en el activo: sale de `costos`). */
const costoVigente = sql<string>`(select round(coalesce(sum(${costos.monto}), 0), 2)::text from ${costos}
  where ${costos.activoId} = ${activos.id} and ${costos.estado} = 'vigente')`;

const columnas = {
  ...getTableColumns(activos),
  claseNombre: clases.nombre,
  incisoFiscal: clases.incisoFiscal,
  costo: costoVigente,
};
type FilaDeActivo = Awaited<ReturnType<ConsultasActivosDrizzle['filas']>>[number];

/** Lecturas de los activos; los nombres de la ubicación salen de las funciones de Empresas (AF-P22 b). */
export class ConsultasActivosDrizzle implements ConsultasActivos {
  private readonly ubicaciones = new UbicacionesEnEmpresas();

  async listar(filtros: FiltrosDeActivos): Promise<ActivoDto[]> {
    return this.conNombres(await this.filas(and(...condiciones(filtros))));
  }

  async obtener(activoId: string): Promise<ActivoFichaDto> {
    const filas = await this.filas(eq(activos.id, activoId));
    const [activo] = await this.conNombres(filas);
    if (!activo) throw new RecursoNoEncontrado('El activo');
    return { ...activo, traslados: await this.trasladosDe(activoId), tramos: await this.tramosDe(activoId) };
  }

  async filas(donde: SQL | undefined) {
    return transaccionEnCurso()
      .select(columnas)
      .from(activos)
      .innerJoin(clases, eq(clases.id, activos.claseId))
      .where(donde)
      .orderBy(asc(activos.codigo));
  }

  private async conNombres(filas: FilaDeActivo[]): Promise<ActivoDto[]> {
    const nombres = await nombresDeUbicaciones(this.ubicaciones, filas);
    return filas.map(({ empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...fila }) => ({
      ...fila,
      localidadNombre: nombres.localidad(fila.localidadId),
      departamentoNombre: nombres.departamento(fila.departamentoId),
    }));
  }

  private async tramosDe(activoId: string): Promise<TramoDto[]> {
    const filas = await transaccionEnCurso()
      .select()
      .from(tramos)
      .where(and(eq(tramos.activoId, activoId), eq(tramos.vigente, true)))
      .orderBy(asc(tramos.desdePeriodo), asc(tramos.libro));
    return filas.map(
      ({
        id,
        empresaId,
        activoId: _activo,
        vigente,
        creadoEn,
        actualizadoEn,
        creadoPor,
        actualizadoPor,
        ...tramo
      }) => ({
        ...tramo,
      }),
    );
  }

  private async trasladosDe(activoId: string): Promise<TrasladoDto[]> {
    const filas = await transaccionEnCurso()
      .select()
      .from(traslados)
      .where(eq(traslados.activoId, activoId))
      .orderBy(desc(traslados.fecha), desc(traslados.creadoEn));
    const nombres = await nombresDeUbicaciones(this.ubicaciones, filas);
    return filas.map((fila) => ({
      id: fila.id,
      esAlta: fila.esAlta,
      fecha: fila.fecha,
      localidadNombre: nombres.localidad(fila.localidadId),
      departamentoNombre: nombres.departamento(fila.departamentoId),
      responsable: fila.responsable,
      recibidoPor: fila.recibidoPor,
      motivo: fila.motivo,
      aBodega: fila.aBodega,
      estado: fila.estado,
    }));
  }
}
