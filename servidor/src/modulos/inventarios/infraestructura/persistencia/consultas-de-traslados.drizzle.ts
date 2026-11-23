import { eq, sql } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import type { BoletaDeTrasladoDto, RenglonDeBoletaDto } from '../../aplicacion/dto/boleta-de-traslado.dto.js';
import type { RenglonDeDocumentoDto } from '../../aplicacion/dto/documento.dto.js';
import type { ConsultasDeTraslados } from '../../aplicacion/puertos/consultas-de-traslados.js';
import { DocumentoInvalido } from '../../dominio/errores-de-kardex.js';
import { ConsultasDeDocumentosDrizzle } from './consultas-de-documentos.drizzle.js';
import { documentos } from './documentos.tablas.js';

const nombreCompleto = (nombres: string | null, apellidos: string | null): string | null =>
  nombres ? `${nombres} ${apellidos ?? ''}`.trim() : null;

/** Lo que la boleta muestra de un renglón: nada de costos. */
const sinCostos = (renglon: RenglonDeDocumentoDto): RenglonDeBoletaDto => ({
  articuloCodigo: renglon.articuloCodigo,
  articuloNombre: renglon.articuloNombre,
  loteCodigo: renglon.loteCodigo,
  cantidad: renglon.cantidad,
  unidadBaseNombre: renglon.unidadBaseNombre,
  cantidadEscrita: renglon.cantidadEscrita,
  unidadEscritaSimbolo: renglon.unidadEscritaSimbolo,
});

/** Un documento con el nombre de quien lo creó; la seguridad por bodega de `documentos` limita lo que se ve. */
const conAutor = () =>
  transaccionEnCurso()
    .select({ documento: documentos, nombres: usuarios.nombres, apellidos: usuarios.apellidos })
    .from(documentos)
    .leftJoin(usuarios, eq(usuarios.id, documentos.creadoPor));

type Fila = Awaited<ReturnType<typeof conAutor>>[number];

/** La boleta de un traslado: nunca lleva costos y sus nombres de bodega salen aunque no se tengan asignadas. */
export class ConsultasDeTrasladosDrizzle implements ConsultasDeTraslados {
  private readonly deDocumentos = new ConsultasDeDocumentosDrizzle();

  async boleta(documentoId: string): Promise<BoletaDeTrasladoDto> {
    const salida = await this.salidaDe(documentoId);
    const documento = salida.documento;
    const entrada = documento.documentoRelacionadoId ? await this.buscar(documento.documentoRelacionadoId) : null;
    const { renglones } = await this.deDocumentos.obtener(documento.id);
    return {
      documentoId: documento.id,
      numero: documento.numero,
      fecha: documento.fecha,
      estado: documento.estado === 'anulado' ? 'anulado' : documento.estadoDeTraslado!,
      origen: await this.nombreDeBodega(documento.bodegaId),
      destino: await this.nombreDeBodega(documento.bodegaDeDestinoId),
      entregadoPor: nombreCompleto(salida.nombres, salida.apellidos),
      entregadoA: documento.entregadoA,
      recibidoPor: entrada ? nombreCompleto(entrada.nombres, entrada.apellidos) : null,
      fechaDeRecepcion: entrada && entrada.documento.estado === 'vigente' ? entrada.documento.fecha : null,
      observaciones: documento.observaciones,
      renglones: renglones.map(sinCostos),
    };
  }

  /** La salida del traslado: el documento mismo o, si se pide con la recepción, la salida a la que está ligada. */
  private async salidaDe(documentoId: string): Promise<Fila> {
    const fila = await this.buscar(documentoId);
    if (!fila) throw new RecursoNoEncontrado('El documento');
    const { clase, documentoRelacionadoId } = fila.documento;
    if (clase === 'salida_de_traslado') return fila;
    if (clase !== 'entrada_de_traslado') throw new DocumentoInvalido('Solo los traslados tienen boleta.');
    const salida = documentoRelacionadoId ? await this.buscar(documentoRelacionadoId) : null;
    if (!salida) throw new RecursoNoEncontrado('El traslado');
    return salida;
  }

  private async buscar(id: string): Promise<Fila | null> {
    const [fila] = await conAutor().where(eq(documentos.id, id));
    return fila ?? null;
  }

  private async nombreDeBodega(id: string | null): Promise<string> {
    const { rows } = await transaccionEnCurso().execute<{ nombre: string }>(
      sql`select nombre from inventarios.nombres_de_bodegas(array[${id}]::uuid[])`,
    );
    return rows[0]?.nombre ?? '';
  }
}
