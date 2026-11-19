import { AnularDocumento } from '../aplicacion/casos-uso/movimientos/anular-documento.js';
import type { DependenciasDeRecepciones } from '../aplicacion/casos-uso/recepciones/dependencias-de-recepciones.js';
import { DescartarLinea } from '../aplicacion/casos-uso/recepciones/descartar-linea.js';
import { DevolverLineaALaBandeja } from '../aplicacion/casos-uso/recepciones/devolver-linea-a-la-bandeja.js';
import { RecibirLineas } from '../aplicacion/casos-uso/recepciones/recibir-lineas.js';
import { RegistrarDevolucionAProveedor } from '../aplicacion/casos-uso/recepciones/registrar-devolucion.js';
import { RegistrarRebajaDeCosto } from '../aplicacion/casos-uso/recepciones/registrar-rebaja.js';
import type {
  RenglonDeRecepcionSolicitado,
  SolicitudDeDevolucion,
  SolicitudDeRebaja,
  SolicitudDeRecepcion,
} from '../aplicacion/dto/por-recibir.dto.js';
import type { LineaDeCompra } from '../dominio/linea-de-compra.js';
import { RecepcionConDocumentosPosteriores } from '../dominio/errores-de-recepcion.js';
import { LibroEnMemoria } from './dobles-del-libro.js';
import { ARTICULO, BODEGA, EscenarioDelKardex } from './escenario-del-kardex.js';

export { ARTICULO, BODEGA };

/** El kardex en memoria con un Libro de compras en memoria al lado: facturas, notas y lo que Inventarios hace con ellas. */
export class EscenarioDeRecepciones {
  readonly base = new EscenarioDelKardex();
  readonly libro = new LibroEnMemoria(this.base.kardex);
  readonly dependencias: DependenciasDeRecepciones = {
    ...this.base.dependencias,
    lineas: this.libro,
    recepciones: this.libro,
    porRecibir: { listar: async () => [] },
    descartes: this.libro,
    marcas: this.libro,
    lotes: { listar: async () => [], agregar: async () => ({ id: 'lote-nuevo' }) as never },
  };

  get operador() {
    return this.base.operador;
  }

  get kardex() {
    return this.base.kardex;
  }

  /** Una línea de una factura del libro marcada como inventario; `costo` en centavos. */
  factura(lineaId: string, costoCentavos: bigint, cambios: Partial<LineaDeCompra> = {}): string {
    this.libro.lineasDelLibro.set(lineaId, {
      lineaId,
      documentoId: `doc-${lineaId}`,
      tipoDeDocumento: 'factura',
      documentoVigente: true,
      documentoAfectadoId: null,
      documento: `A-${lineaId}`,
      numeroDeLinea: 1,
      fechaEmision: '2026-09-01',
      esInventario: true,
      costoCentavos,
      ...cambios,
    });
    return lineaId;
  }

  /** Una línea de una nota de crédito que corrige la factura de `facturaLineaId`. */
  nota(lineaId: string, facturaLineaId: string, costoCentavos: bigint): string {
    return this.factura(lineaId, costoCentavos, {
      tipoDeDocumento: 'nota_de_credito',
      documentoAfectadoId: `doc-${facturaLineaId}`,
      esInventario: false,
      fechaEmision: '2026-09-20',
    });
  }

  renglon(lineaId: string, cantidad: string, monto: string) {
    return {
      lineaId,
      articuloId: ARTICULO,
      loteId: null,
      loteNuevo: null,
      cantidad,
      unidadId: null,
      monto,
    } satisfies RenglonDeRecepcionSolicitado;
  }

  recibir(renglones: RenglonDeRecepcionSolicitado[], cambios: Partial<SolicitudDeRecepcion> = {}) {
    const solicitud: SolicitudDeRecepcion = {
      fecha: '2026-09-01',
      bodegaId: BODEGA,
      observaciones: null,
      renglones,
      ...cambios,
    };
    return new RecibirLineas(this.dependencias).ejecutar(this.operador, solicitud, this.base.vista);
  }

  devolver(lineaId: string, renglones: SolicitudDeDevolucion['renglones'], fecha = '2026-09-21') {
    const solicitud: SolicitudDeDevolucion = { fecha, lineaId, observaciones: null, renglones };
    return new RegistrarDevolucionAProveedor(this.dependencias).ejecutar(this.operador, solicitud, this.base.vista);
  }

  rebajar(lineaId: string, monto: string, cambios: Partial<SolicitudDeRebaja> = {}) {
    const solicitud: SolicitudDeRebaja = {
      fecha: '2026-09-21',
      lineaId,
      monto,
      base: 'valor',
      observaciones: null,
      ...cambios,
    };
    return new RegistrarRebajaDeCosto(this.dependencias).ejecutar(this.operador, solicitud, this.base.vista);
  }

  descartar(lineaId: string, motivo = 'Era gasto') {
    return new DescartarLinea(this.dependencias).ejecutar(this.operador, { lineaId, motivo });
  }

  devolverALaBandeja(lineaId: string) {
    return new DevolverLineaALaBandeja(this.dependencias).ejecutar(this.operador, lineaId);
  }

  /** Anula con la misma guardia que usa la composición: una recepción con devoluciones o rebajas no se anula. */
  anular(clase: Parameters<EscenarioDelKardex['anular']>[0], documentoId: string, motivo = 'Error') {
    const guardia =
      clase === 'recepcion_de_compra'
        ? async ({ id }: { id: string }) => {
            const numeros = await this.libro.documentosQueDependenDe(id);
            if (numeros.length > 0) throw new RecepcionConDocumentosPosteriores(numeros);
          }
        : undefined;
    return new AnularDocumento(this.dependencias, clase, guardia).ejecutar(
      this.operador,
      { documentoId, motivo },
      this.base.vista,
    );
  }
}
