import { expect } from 'vitest';
import {
  consultar,
  documentoDePrueba,
  nitValido,
  registrarProveedor,
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

let secuencia = 0;

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

  /**
   * Siembra un saldo inicial ya completado (U8-3 aún no ofrece la carga): sin documento del libro, de Q1,120.00 con
   * Q700.00 por pagar al corte y Q50.00 de retenciones por practicar. Devuelve su id de Cuentas por pagar.
   */
  async sembrarSaldoInicial(cambios: Record<string, unknown> = {}): Promise<string> {
    const { cuenta, proveedorId } = this.escenario;
    const [usuario] = await consultar<{ id: string }>('select id from core.usuarios where usuario = $1', [
      cuenta.usuario,
    ]);
    const valores = {
      serie: 'S',
      numero: `SALDO${++secuencia}`,
      tipo: 'factura',
      proveedorId,
      fechaEmision: '2026-10-20',
      total: '1120',
      retenciones: '120',
      saldoAlInicio: '700',
      retencionesPorPracticar: '50',
      referencia: 'CXP-0045',
      vencimiento: '2026-11-20',
      ...cambios,
    };
    const [fila] = await consultar<{ id: string }>(
      `insert into cuentas_por_pagar.documentos (empresa_id, origen, serie, numero, tipo, proveedor_id, fecha_emision,
         total, retenciones, saldo_al_inicio, retenciones_por_practicar, referencia, vencimiento, estado,
         registrado_en, registrado_por)
       values ($1, 'saldo_inicial', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'registrado', now(), $13)
       returning id`,
      [
        cuenta.empresaId,
        valores.serie,
        valores.numero,
        valores.tipo,
        valores.proveedorId,
        valores.fechaEmision,
        valores.total,
        valores.retenciones,
        valores.saldoAlInicio,
        valores.retencionesPorPracticar,
        valores.referencia,
        valores.vencimiento,
        usuario!.id,
      ],
    );
    return fila!.id;
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

/**
 * Un proveedor nuevo con sus días de crédito (`null` es el plazo por omisión), para tener documentos propios; devuelve
 * también un NIT válido distinto para el emisor de sus documentos.
 */
export async function proveedorConCredito(
  escenario: EscenarioDeDocumentos,
  { nombre, nit, diasDeCredito }: { nombre: string; nit: string; diasDeCredito: number | null },
) {
  const { proveedorId } = await registrarProveedor(escenario.cuenta, nombre, {
    secciones: { 'cuentas-por-pagar': { diasDeCredito } },
  });
  return { proveedorId, nitEmisor: nitValido(nit) };
}
