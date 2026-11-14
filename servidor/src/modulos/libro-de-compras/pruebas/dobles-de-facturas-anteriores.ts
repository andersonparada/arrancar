import type {
  ClaveDeFacturaAnterior,
  FacturaAnteriorConNotas,
  NotaQueCitaLaFactura,
  RepositorioDeFacturasAnteriores,
} from '../aplicacion/puertos/puertos-de-facturas-anteriores.js';
import type { FacturaAnterior } from '../dominio/factura-anterior.js';

/** Las facturas del sistema anterior en memoria; las pruebas llenan `filas`, `notas` y `delLibro` a mano. */
export class FacturasAnterioresEnMemoria implements RepositorioDeFacturasAnteriores {
  readonly filas: FacturaAnteriorConNotas[] = [];
  readonly agregadas: FacturaAnterior[] = [];
  readonly corregidas: FacturaAnterior[] = [];
  /** La factura vigente del libro que se encuentra con la clave; `null`: ninguna. */
  delLibro: { id: string } | null = null;
  /** La nota vigente que cita la clave; `null`: ninguna. */
  notaQueLaCita: NotaQueCitaLaFactura | null = null;

  async buscar(clave: ClaveDeFacturaAnterior, _bloquear: boolean): Promise<FacturaAnteriorConNotas | null> {
    const porFel = clave.autorizacionFel
      ? this.filas.find((fila) => fila.autorizacionFel === clave.autorizacionFel)
      : undefined;
    const porClave = this.filas.find(
      (fila) =>
        fila.proveedorId === clave.proveedorId &&
        fila.numero === clave.numero &&
        (fila.serie ?? '') === (clave.serie ?? ''),
    );
    return porFel ?? porClave ?? null;
  }

  async buscarFacturaDelLibro(_clave: ClaveDeFacturaAnterior): Promise<{ id: string } | null> {
    return this.delLibro;
  }

  async buscarNotaVigenteQueLaCita(_clave: ClaveDeFacturaAnterior): Promise<NotaQueCitaLaFactura | null> {
    return this.notaQueLaCita;
  }

  async agregar(_empresaId: string, factura: FacturaAnterior): Promise<void> {
    this.agregadas.push(factura);
  }

  async corregir(factura: FacturaAnterior): Promise<void> {
    this.corregidas.push(factura);
  }
}
