import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { DocumentoInvalido } from '../../../dominio/errores-de-kardex.js';
import { lotePermitido } from '../../../dominio/lote.js';
import type { LoteDto } from '../../dto/lote.dto.js';
import type { SolicitudDeSaldoInicial } from '../../dto/saldo-inicial.dto.js';
import type { DependenciasDeSaldosIniciales } from './dependencias-de-saldos-iniciales.js';

type Lectura = Pick<DependenciasDeSaldosIniciales, 'catalogos' | 'lotes'>;

type DatosDelLote = Pick<SolicitudDeSaldoInicial, 'articuloId' | 'loteId' | 'loteCodigo' | 'loteVencimiento'>;

/**
 * El lote de un renglón de saldo inicial: el que se eligió, o el que se escribió por su código (en Excel, y en el
 * formulario cuando el lote todavía no existe). Si el código ya es de un lote del artículo se usa ese; si no, se crea
 * con su vencimiento.
 */
export class ResolutorDeLoteDeSaldo {
  constructor(private readonly dependencias: Lectura) {}

  /**
   * @throws DocumentoInvalido si se dan el lote y su código a la vez, o el código ya existe con otro vencimiento.
   * @throws RecursoNoEncontrado si el artículo no existe.
   * @throws LoteInvalido si el artículo no maneja lotes o falta el vencimiento que exige.
   */
  async resolver(operador: Operador, datos: DatosDelLote): Promise<string | null> {
    const codigo = datos.loteCodigo?.trim();
    if (!codigo) return datos.loteId;
    if (datos.loteId) throw new DocumentoInvalido('Elija el lote o escriba su código, no los dos.');
    const existente = await this.buscar(datos.articuloId, codigo);
    return existente ? this.delExistente(existente, datos) : this.crear(operador, { ...datos, loteCodigo: codigo });
  }

  private delExistente(existente: LoteDto, datos: DatosDelLote): string {
    if (datos.loteVencimiento && existente.fechaDeVencimiento !== datos.loteVencimiento) {
      throw new DocumentoInvalido(`El lote ${existente.codigo} ya existe con otro vencimiento.`);
    }
    return existente.id;
  }

  private async buscar(articuloId: string, codigo: string) {
    const delArticulo = await this.dependencias.lotes.listar(articuloId);
    return delArticulo.find((lote) => lote.codigo.toUpperCase() === codigo.toUpperCase()) ?? null;
  }

  private async crear(operador: Operador, datos: DatosDelLote): Promise<string> {
    const [articulo] = await this.dependencias.catalogos.articulos([datos.articuloId]);
    if (!articulo) throw new RecursoNoEncontrado('El artículo');
    const lote = lotePermitido(
      { manejaLotes: articulo.manejaLotes, manejaVencimiento: articulo.manejaVencimiento ?? false },
      {
        codigo: datos.loteCodigo!,
        fechaDeVencimiento: datos.loteVencimiento,
        fechaDeFabricacion: null,
        observaciones: null,
      },
    );
    return (await this.dependencias.lotes.agregar(operador.empresaId, datos.articuloId, lote)).id;
  }
}
