import { EntregarAnticipo } from '../aplicacion/casos-uso/anticipos/entregar-anticipo.js';
import type { PeticionDeAnticipo } from '../aplicacion/casos-uso/anticipos/peticion-de-anticipo.js';
import { RecibirDocumento } from '../aplicacion/casos-uso/gastos/recibir-documento.js';
import type { Anticipo } from '../dominio/anticipos.js';
import type { Gasto } from '../dominio/gastos.js';
import { dependenciasDeGastosEnMemoria, documentoDelLibro, operadorDePrueba } from './dobles-de-gastos.js';

export const operador = operadorDePrueba();

const entrega = {
  forma: 'cheque',
  chequeraId: 'chequera-1',
  beneficiarioId: 'tercero-1',
  esEmpleado: true,
  clase: 'viatico',
  descripcion: 'Viaje a la finca',
  monto: '1000.00',
  fecha: '2026-11-10',
  puedeConVencidos: false,
} as PeticionDeAnticipo;

/** Los casos de uso de los gastos en memoria con un anticipo abierto de Q1,000.00 entregado el 10 de nov de 2026 (hoy es el 18). */
export async function prepararEscenarioDeGastos() {
  const piezas = dependenciasDeGastosEnMemoria();
  const anticipoId = (await new EntregarAnticipo(piezas.dependencias).ejecutar(operador, entrega)).id;
  piezas.publicadorEventos.publicados.length = 0;
  piezas.auditoria.entradas.length = 0;
  const recibir = new RecibirDocumento(piezas.dependenciasDeGastos);

  /** Recibe un documento sin referencia (queda en la bandeja) y devuelve su gasto. */
  async function enLaBandeja(cambios: Record<string, unknown> = {}): Promise<Gasto> {
    const documento = documentoDelLibro(cambios);
    await recibir.ejecutar(operador, documento);
    piezas.publicadorEventos.publicados.length = 0;
    return (await piezas.gastos.delDocumento(documento.documentoId))!;
  }

  /** Cambia el anticipo guardado (por ejemplo, para dejarlo liquidado). */
  function cambiarElAnticipo(cambios: Partial<Anticipo>): void {
    piezas.anticipos.guardados.set(anticipoId, { ...piezas.anticipos.guardados.get(anticipoId)!, ...cambios });
  }

  return { ...piezas, anticipoId, recibir, enLaBandeja, cambiarElAnticipo };
}
