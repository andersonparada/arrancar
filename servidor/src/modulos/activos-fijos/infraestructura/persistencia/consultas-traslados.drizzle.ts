import { asc, eq, sql } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { configuracion } from '../../../core/configuracion/contexto.js';
import type { BoletaDto, BoletaFirmadaDto, RenglonDeBoletaDto } from '../../aplicacion/dto/traslado.dto.js';
import type { ConsultasTraslados } from '../../aplicacion/puertos/consultas-traslados.js';
import { activos } from './activos.tablas.js';
import { firmadaDeLaBoleta } from './firmada-de-boleta.consulta.drizzle.js';
import { nombresDeUbicaciones } from './nombres-de-ubicaciones.js';
import { traslados } from './traslados.tablas.js';
import { UbicacionesEnEmpresas } from './ubicaciones-en-empresas.drizzle.js';

/** El código del activo principal de un componente, para decir «componente de AF-0001» en la boleta. */
const codigoDelPrincipal = sql<
  string | null
>`(select p.codigo from ${activos} p where p.id = ${activos.activoPadreId})`;

type FilaDeBoleta = { activo: typeof activos.$inferSelect; componenteDe: string | null };

function aRenglon({ activo, componenteDe }: FilaDeBoleta): RenglonDeBoletaDto {
  const { id, codigo, descripcion, marca, modelo, numeroDeSerie, placa, cantidad } = activo;
  return { activoId: id, codigo, descripcion, marca, modelo, numeroDeSerie, placa, cantidad, componenteDe };
}

/** Lecturas de las boletas de traslado; los nombres de la ubicación salen de las funciones de Empresas (AF-P22 b). */
export class ConsultasTrasladosDrizzle implements ConsultasTraslados {
  private readonly ubicaciones = new UbicacionesEnEmpresas();

  async boleta(grupoId: string): Promise<BoletaDto> {
    const filas = await this.filas(grupoId);
    const primera = filas[0];
    if (!primera) throw new RecursoNoEncontrado('La boleta de traslado');
    const { traslado } = primera;
    const nombres = await nombresDeUbicaciones(this.ubicaciones, [traslado]);
    return {
      grupoId,
      numero: traslado.numero!,
      anioDeNumero: traslado.anioDeNumero!,
      titulo: await this.titulo(),
      fecha: traslado.fecha,
      localidadNombre: nombres.localidad(traslado.localidadId),
      departamentoNombre: nombres.departamento(traslado.departamentoId),
      responsable: traslado.responsable,
      recibidoPor: traslado.recibidoPor!,
      motivo: traslado.motivo!,
      aBodega: traslado.aBodega,
      estado: traslado.estado,
      anuladoEn: traslado.anuladoEn?.toISOString() ?? null,
      motivoDeAnulacion: traslado.motivoDeAnulacion,
      firmada: await this.firmadaDe(grupoId),
      renglones: filas.map(aRenglon),
    };
  }

  firmadaDe(grupoId: string): Promise<BoletaFirmadaDto | null> {
    return firmadaDeLaBoleta(grupoId);
  }

  /** El nombre que la empresa le da a la responsiva (`activos-fijos.documentos.nombre_de_responsiva`). */
  private titulo(): Promise<string> {
    const { cuentaId, empresaId } = contextoEnCurso();
    return configuracion.lector.obtener<string>('activos-fijos.documentos.nombre_de_responsiva', {
      cuentaId,
      empresaId,
    });
  }

  private filas(grupoId: string) {
    return transaccionEnCurso()
      .select({ traslado: traslados, activo: activos, componenteDe: codigoDelPrincipal })
      .from(traslados)
      .innerJoin(activos, eq(activos.id, traslados.activoId))
      .where(eq(traslados.grupoId, grupoId))
      .orderBy(asc(activos.codigo));
  }
}
