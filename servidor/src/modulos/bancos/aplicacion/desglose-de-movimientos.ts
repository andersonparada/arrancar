import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import type { LineaDeConcepto } from '../../core/contratos/bancos.contratos.js';
import { aCentavos, deCentavos } from '../dominio/centavos.js';
import { ConceptoDeDesgloseIncompatible, DesgloseNoSuma, DesgloseSinLineas } from '../dominio/errores-de-origen.js';
import type { ConceptosDeMovimientos } from './conceptos-de-movimientos.js';
import type { RepositorioDeDesglose } from './puertos/repositorio-de-desglose.js';

interface Dependencias {
  conceptos: ConceptosDeMovimientos;
  repositorio: RepositorioDeDesglose;
}

interface LineaResuelta {
  conceptoId: string;
  montoCentavos: number;
}

/** Las líneas ya resueltas a conceptos de la empresa; `principalId` es el concepto de mayor monto. */
export interface RepartoResuelto {
  principalId: string;
  lineas: LineaResuelta[];
}

interface PedidoDeReparto {
  tipo: 'credito' | 'debito' | 'cheque';
  monto: string;
  lineas: LineaDeConcepto[];
}

interface ReparticionAGuardar {
  movimientoId: string;
  conceptoDelMovimientoId: string;
  reparto: RepartoResuelto;
}

const sumar = (lineas: LineaResuelta[]) => lineas.reduce((suma, { montoCentavos }) => suma + montoCentavos, 0);

/** Suma las líneas de una misma clave y exige montos enteros positivos. */
function juntarPorClave(lineas: LineaDeConcepto[]): Map<string, number> {
  if (lineas.length === 0) throw new DesgloseSinLineas();
  const juntas = new Map<string, number>();
  for (const { claveDeSistema, montoCentavos } of lineas) {
    if (!Number.isInteger(montoCentavos) || montoCentavos <= 0) throw new DesgloseSinLineas();
    juntas.set(claveDeSistema, (juntas.get(claveDeSistema) ?? 0) + montoCentavos);
  }
  return juntas;
}

/**
 * El reparto por concepto de un movimiento de otro módulo o de una nota marcada (CP4, diseño §6.2): revisa las líneas
 * (claves de sistema del mismo tipo que el movimiento, sumas exactas) y las guarda solo cuando el reparto no es «todo
 * al concepto del movimiento». Corre dentro de la unidad de trabajo de quien lo llama.
 */
export class DesgloseDeMovimientos {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws DesgloseSinLineas, ConceptoDeDesgloseIncompatible o DesgloseNoSuma. */
  async resolver(operador: Operador, { tipo, monto, lineas }: PedidoDeReparto): Promise<RepartoResuelto> {
    const resueltas: LineaResuelta[] = [];
    for (const [clave, montoCentavos] of juntarPorClave(lineas)) {
      const concepto = await this.dependencias.conceptos.deSistema(operador, clave);
      const direccion = tipo === 'credito' ? 'credito' : 'debito';
      const { aplicaA } = concepto.instantanea();
      if (aplicaA !== 'ambos' && aplicaA !== direccion) throw new ConceptoDeDesgloseIncompatible();
      resueltas.push({ conceptoId: concepto.id.valor, montoCentavos });
    }
    const suma = sumar(resueltas);
    if (suma !== aCentavos(monto)) throw new DesgloseNoSuma(deCentavos(suma), monto);
    const principal = resueltas.reduce((mayor, linea) => (linea.montoCentavos > mayor.montoCentavos ? linea : mayor));
    return { principalId: principal.conceptoId, lineas: resueltas };
  }

  /**
   * Guarda el reparto si no es «todo al concepto del movimiento» y, si lo es, quita el que hubiera.
   * @returns si el movimiento quedó con desglose.
   */
  async guardar(operador: Operador, { movimientoId, conceptoDelMovimientoId, reparto }: ReparticionAGuardar) {
    const sinDesglose = reparto.lineas.length === 1 && reparto.lineas[0]!.conceptoId === conceptoDelMovimientoId;
    const lineas = sinDesglose
      ? []
      : reparto.lineas.map(({ conceptoId, montoCentavos }) => ({ conceptoId, monto: deCentavos(montoCentavos) }));
    await this.dependencias.repositorio.reemplazar(operador.empresaId, movimientoId, lineas);
    return !sinDesglose;
  }

  /** Quita el reparto (al desmarcar una nota): vuelve a ser «todo al concepto del movimiento». */
  quitar(operador: Operador, movimientoId: string): Promise<void> {
    return this.dependencias.repositorio.reemplazar(operador.empresaId, movimientoId, []);
  }
}
