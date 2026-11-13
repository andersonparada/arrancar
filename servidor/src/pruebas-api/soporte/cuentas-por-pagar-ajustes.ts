import { expect } from 'vitest';
import { proveedorConCredito, type DocumentosPorPagarDePrueba } from './cuentas-por-pagar.js';
import { notaConSaldoLibre, type NotaConSaldoLibre } from './cuentas-por-pagar-notas.js';
import type { ClienteApi } from './cliente-api.js';
import { consultar, haceDias, type EscenarioDeDocumentos } from './escenario-de-documentos.js';

const RUTA = '/api/cuentas-por-pagar';
const NOMBRES = ['Alfa', 'Bravo', 'Cobre', 'Delta', 'Eco', 'Fénix', 'Gama', 'Halcón', 'Índigo', 'Jade', 'Kilo', 'Lima'];

/** Una nota con su proveedor. */
export type NotaDeProveedor = NotaConSaldoLibre & { proveedorId: string; nitEmisor: string };

/** Lo común de las pruebas de API de los ajustes de saldo (CP2-4). */
export class AjustesDePrueba {
  private secuencia = 0;

  constructor(
    private readonly escenario: EscenarioDeDocumentos,
    private readonly documentos: DocumentosPorPagarDePrueba,
    private readonly primerNit: number,
  ) {}

  propietario(): ClienteApi {
    return this.escenario.cuenta.propietario;
  }

  /** Ajusta; por omisión con la causa «No se recuperará» y un motivo. */
  ajustar(notaPropia: string, cuerpo: Record<string, unknown>, cliente: ClienteApi = this.propietario()) {
    return cliente.post(`${RUTA}/documentos/${notaPropia}/ajustes`, {
      causa: 'no_recuperable',
      motivo: 'El proveedor cerró',
      ...cuerpo,
    });
  }

  anular(ajusteId: string, cuerpo: Record<string, unknown> = { motivo: 'Por error' }, cliente = this.propietario()) {
    return cliente.post(`${RUTA}/ajustes/${ajusteId}/anular`, cuerpo);
  }

  async ficha(id: string) {
    return (await this.propietario().get(`${RUTA}/documentos/${id}`)).cuerpo;
  }

  auditoria(accion: string, registroId: string) {
    return consultar<{ motivo: string; anterior: Record<string, unknown> }>(
      "select motivo, anterior from core.auditoria where recurso = 'cuentas-por-pagar.ajustes' and accion = $1 and registro_id = $2",
      [accion, registroId],
    );
  }

  /** Un proveedor propio con una factura y una nota de Q100.00 de saldo libre; `completar` la deja registrada. */
  async unaNota({ completar = true }: { completar?: boolean } = {}): Promise<NotaDeProveedor> {
    const { proveedorId, nitEmisor } = await proveedorConCredito(this.escenario, {
      nombre: `${NOMBRES[this.secuencia]} S.A.`,
      nit: String(this.primerNit + this.secuencia++),
      diasDeCredito: 30,
    });
    const nota = await notaConSaldoLibre(this.documentos, { proveedorId, nitEmisor, fechaRecepcion: haceDias(3) });
    if (completar) {
      const respuesta = await this.propietario().post(`${RUTA}/documentos/registrar`, {
        documentos: [{ id: nota.notaPropia }],
      });
      expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    }
    return { proveedorId, nitEmisor, ...nota };
  }
}
