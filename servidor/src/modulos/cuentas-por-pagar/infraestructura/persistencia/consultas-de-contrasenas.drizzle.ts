import { aliasedTable, and, desc, eq, gte, inArray, lte, ne, sql, type SQL } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { terceros } from '../../../terceros/infraestructura/persistencia/terceros.tablas.js';
import type { FilaDeDocumento, PaginacionDeDocumentos } from '../../aplicacion/puertos/puertos-de-consultas.js';
import type {
  ConsultasDeContrasenas,
  ContrasenaConDocumentos,
  ContrasenaGuardada,
  FiltroDeContrasenas,
} from '../../aplicacion/puertos/puertos-de-contrasenas.js';
import type { EstadoDeContrasena } from '../../dominio/contrasena.js';
import { aplicacionesDeNotas } from './aplicaciones-de-notas.tablas.js';
import { aFilaDeDocumento, ConsultaBaseDeDocumentos } from './consulta-base-de-documentos.js';
import { contrasenaDocumentos } from './contrasena-documentos.tablas.js';
import { contrasenas } from './contrasenas.tablas.js';
import { documentos } from './documentos.tablas.js';

const nombreCompleto = (nombres: string | null, apellidos: string | null): string | null =>
  nombres ? `${nombres} ${apellidos ?? ''}`.trim() : null;

/** Las condiciones de la lista; las que no vienen en el filtro no se aplican. */
function condicionesDe(filtro: FiltroDeContrasenas): SQL | undefined {
  return and(
    filtro.proveedorId ? eq(contrasenas.proveedorId, filtro.proveedorId) : undefined,
    filtro.estado === 'todas' ? undefined : eq(contrasenas.estado, filtro.estado),
    filtro.desde ? gte(contrasenas.fecha, filtro.desde) : undefined,
    filtro.hasta ? lte(contrasenas.fecha, filtro.hasta) : undefined,
    filtro.pagoDesde ? gte(contrasenas.fechaDePago, filtro.pagoDesde) : undefined,
    filtro.pagoHasta ? lte(contrasenas.fechaDePago, filtro.pagoHasta) : undefined,
  );
}

/** Las contraseñas con el nombre del proveedor y de quienes la crearon y anularon; quien llama agrega `where` y orden. */
function seleccionarContrasenas() {
  const anulador = aliasedTable(usuarios, 'anulador');
  return transaccionEnCurso()
    .select({
      contrasena: contrasenas,
      proveedorNombre: terceros.nombreMostrar,
      proveedorNit: terceros.nit,
      creadorNombres: usuarios.nombres,
      creadorApellidos: usuarios.apellidos,
      anuladorNombres: anulador.nombres,
      anuladorApellidos: anulador.apellidos,
      total: sql<number>`count(*) over ()`.mapWith(Number),
    })
    .from(contrasenas)
    .innerJoin(proveedores, eq(proveedores.id, contrasenas.proveedorId))
    .innerJoin(terceros, eq(terceros.id, proveedores.terceroId))
    .leftJoin(usuarios, eq(usuarios.id, contrasenas.creadoPor))
    .leftJoin(anulador, eq(anulador.id, contrasenas.anuladaPor));
}

type FilaDeContrasena = Awaited<ReturnType<ReturnType<typeof seleccionarContrasenas>['limit']>>[number];

function aContrasenaGuardada({ contrasena: c, ...resto }: FilaDeContrasena): ContrasenaGuardada {
  const anulada = c.estado === 'anulada' && c.anuladaEn !== null;
  return {
    id: c.id,
    proveedorId: c.proveedorId,
    proveedorNombre: resto.proveedorNombre,
    proveedorNit: resto.proveedorNit,
    numero: c.numero,
    anioDeNumero: c.anioDeNumero,
    fecha: c.fecha,
    fechaDePago: c.fechaDePago,
    observaciones: c.observaciones,
    estado: c.estado as EstadoDeContrasena,
    impresaEn: c.impresaEn?.toISOString() ?? null,
    anulacion: anulada
      ? {
          motivo: c.motivoDeAnulacion ?? '',
          anuladaPorNombre: nombreCompleto(resto.anuladorNombres, resto.anuladorApellidos),
          anuladaEn: c.anuladaEn!.toISOString(),
        }
      : null,
    creadoPorNombre: nombreCompleto(resto.creadorNombres, resto.creadorApellidos),
    creadoEn: c.creadoEn.toISOString(),
  };
}

/** Las filas de los documentos con sus saldos de hoy, por id. */
async function filasPorId(ids: readonly string[]): Promise<Map<string, FilaDeDocumento>> {
  const filas = await new ConsultaBaseDeDocumentos().seleccionar().where(inArray(documentos.id, [...ids]));
  return new Map(filas.map((fila) => [fila.documento.id, aFilaDeDocumento(fila)]));
}

/** Los documentos de cada contraseña y lo que sus notas aplicaron dentro de ella. */
async function documentosDe(
  contrasenaIds: readonly string[],
): Promise<Map<string, Omit<ContrasenaConDocumentos, 'contrasena'>>> {
  const resultado = new Map(
    contrasenaIds.map((id) => [
      id,
      { documentos: [] as FilaDeDocumento[], aplicadoPorNota: new Map<string, number>() },
    ]),
  );
  if (contrasenaIds.length === 0) return resultado;
  const enlaces = await transaccionEnCurso()
    .select({ contrasenaId: contrasenaDocumentos.contrasenaId, documentoId: contrasenaDocumentos.documentoId })
    .from(contrasenaDocumentos)
    .where(inArray(contrasenaDocumentos.contrasenaId, [...contrasenaIds]));
  const porId = await filasPorId(enlaces.map(({ documentoId }) => documentoId));
  for (const { contrasenaId, documentoId } of enlaces) {
    resultado.get(contrasenaId)!.documentos.push(porId.get(documentoId)!);
  }
  await sumarAplicaciones(contrasenaIds, resultado);
  return resultado;
}

async function sumarAplicaciones(
  contrasenaIds: readonly string[],
  resultado: Map<string, { aplicadoPorNota: Map<string, number> }>,
): Promise<void> {
  const aplicado = await transaccionEnCurso()
    .select({
      contrasenaId: aplicacionesDeNotas.contrasenaId,
      notaId: aplicacionesDeNotas.notaId,
      monto: sql<string>`sum(${aplicacionesDeNotas.monto})`,
    })
    .from(aplicacionesDeNotas)
    .where(inArray(aplicacionesDeNotas.contrasenaId, [...contrasenaIds]))
    .groupBy(aplicacionesDeNotas.contrasenaId, aplicacionesDeNotas.notaId);
  for (const { contrasenaId, notaId, monto } of aplicado) {
    resultado.get(contrasenaId!)!.aplicadoPorNota.set(notaId, aCentavos(monto));
  }
}

/** Listado, ficha y documentos disponibles de las contraseñas. La seguridad por empresa (RLS) limita todas las consultas. */
export class ConsultasDeContrasenasDrizzle implements ConsultasDeContrasenas {
  async listar(
    filtro: FiltroDeContrasenas,
    { pagina, limite }: PaginacionDeDocumentos,
  ): Promise<{ filas: ContrasenaConDocumentos[]; total: number }> {
    const filas = await seleccionarContrasenas()
      .where(condicionesDe(filtro))
      .orderBy(desc(contrasenas.fecha), desc(contrasenas.creadoEn))
      .limit(limite)
      .offset((pagina - 1) * limite);
    return { filas: await this.conDocumentos(filas), total: filas[0]?.total ?? 0 };
  }

  async detalle(id: string): Promise<ContrasenaConDocumentos | null> {
    const filas = await seleccionarContrasenas().where(eq(contrasenas.id, id));
    return (await this.conDocumentos(filas))[0] ?? null;
  }

  async disponiblesDe(proveedorId: string): Promise<FilaDeDocumento[]> {
    const base = new ConsultaBaseDeDocumentos();
    const sinContrasena = sql`not exists (select 1 from ${contrasenaDocumentos}
      where ${contrasenaDocumentos.documentoId} = ${documentos.id} and ${contrasenaDocumentos.vigente})`;
    const conSaldo = sql`(case when ${documentos.tipo} = 'nota_de_credito' then ${base.saldoLibreDeLaNota()}
      else ${base.saldoDelCargo()} end) > 0`;
    const filas = await base
      .seleccionar()
      .where(and(eq(documentos.proveedorId, proveedorId), ne(documentos.estado, 'anulado'), sinContrasena, conSaldo));
    return filas.map(aFilaDeDocumento);
  }

  async nombreDelUsuario(usuarioId: string): Promise<string | null> {
    const [fila] = await transaccionEnCurso()
      .select({ nombres: usuarios.nombres, apellidos: usuarios.apellidos })
      .from(usuarios)
      .where(eq(usuarios.id, usuarioId));
    return fila ? nombreCompleto(fila.nombres, fila.apellidos) : null;
  }

  private async conDocumentos(filas: FilaDeContrasena[]): Promise<ContrasenaConDocumentos[]> {
    const detalles = await documentosDe(filas.map(({ contrasena }) => contrasena.id));
    return filas.map((fila) => ({ contrasena: aContrasenaGuardada(fila), ...detalles.get(fila.contrasena.id)! }));
  }
}
