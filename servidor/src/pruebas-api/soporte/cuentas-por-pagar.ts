import { expect } from 'vitest';
import {
  consultar,
  documentoDePrueba,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './escenario-de-documentos.js';

/** Los módulos de una cuenta que usa Cuentas por pagar (el módulo exige Libro de compras y Bancos). */
export const MODULOS_DE_CUENTAS_POR_PAGAR = ['terceros', 'libro-de-compras', 'bancos', 'cuentas-por-pagar'];

export interface FilaDeDocumentoPorPagar {
  id: string;
  tipo: string;
  estado: string;
  vencimiento: string | null;
  total: string;
  retenciones: string;
  proveedor_id: string;
  empresa_id: string;
  documento_afectado_id: string | null;
  fecha_emision: string;
  estaba_autorizado: boolean | null;
  motivo_de_anulacion: string | null;
}

/** Registra documentos por la API de Libro de compras (que los manda a Cuentas por pagar) y lee lo que quedó en la base. */
export class DocumentosPorPagarDePrueba {
  constructor(
    private readonly escenario: EscenarioDeDocumentos,
    private readonly emision: string,
  ) {}

  /** Registra un documento y devuelve su id (el de Libro de compras). */
  async registrar(cambios: Record<string, unknown> = {}): Promise<string> {
    const cuerpo = documentoDePrueba(this.escenario, { fechaEmision: this.emision, ...cambios });
    const respuesta = await this.escenario.cuenta.propietario.post(RUTA_DOCUMENTOS, cuerpo);
    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    return respuesta.cuerpo.documento.id as string;
  }

  /** Registra una nota de crédito (`NCRE`) o de débito (`NDEB`) de la factura. */
  registrarNota(
    tipoDte: 'NCRE' | 'NDEB',
    facturaId: string,
    { total, ...cambios }: { total: string } & Record<string, unknown>,
  ): Promise<string> {
    return this.registrar({
      tipoDte,
      documentoAfectadoId: facturaId,
      serie: tipoDte === 'NDEB' ? 'D' : 'N',
      lineas: [{ conceptoId: this.escenario.conceptoId, total }],
      ...cambios,
    });
  }

  async fila(documentoId: string): Promise<FilaDeDocumentoPorPagar | undefined> {
    const filas = await consultar<FilaDeDocumentoPorPagar>(
      `select id, tipo, estado, vencimiento::text, total::text, retenciones::text, proveedor_id, empresa_id,
              documento_afectado_id, fecha_emision::text, estaba_autorizado, motivo_de_anulacion
         from cuentas_por_pagar.documentos where documento_id = $1`,
      [documentoId],
    );
    return filas[0];
  }

  /** Lo que la nota rebajó, por cargo (cada uno con su id de Libro de compras), del más antiguo al más nuevo. */
  aplicacionesDe(notaDocumentoId: string) {
    return consultar<{ monto: string; cargo_documento_id: string }>(
      `select a.monto::text, c.documento_id as cargo_documento_id from cuentas_por_pagar.aplicaciones_de_notas a
         join cuentas_por_pagar.documentos n on n.id = a.nota_id
         join cuentas_por_pagar.documentos c on c.id = a.cargo_id
        where n.documento_id = $1 order by c.fecha_emision, c.creado_en`,
      [notaDocumentoId],
    );
  }
}
