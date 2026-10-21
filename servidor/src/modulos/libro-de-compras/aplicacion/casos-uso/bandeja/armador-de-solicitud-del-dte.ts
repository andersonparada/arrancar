import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { DteRecibido } from '../../../dominio/dte-recibido.js';
import type { LectorDeConfiguracionFiscal } from '../../puertos/puertos-de-documentos.js';
import { datosFiscalesDe, decisionesDe, type DatosFiscalesPorProveedor } from './decisiones-del-dte.js';
import type { ProponedorDeDte } from './proponedor-de-dte.js';
import { solicitudDesdeElDte, type DecisionesDelDte, type SolicitudConAvisos } from './solicitud-desde-el-dte.js';

export interface OpcionesDelArmado {
  proponedor: ProponedorDeDte;
  datosFiscalesPorProveedor?: DatosFiscalesPorProveedor;
  /** Para el formulario: un IVA que no cuadra no es un error, la solicitud sale sin deducir el exento. */
  tolerante?: boolean;
}

/** Junta lo completado de una fila con las propuestas y arma la solicitud de registro con los montos del DTE. */
export class ArmadorDeSolicitudDelDte {
  constructor(private readonly dependencias: { configuracion: LectorDeConfiguracionFiscal }) {}

  /** @throws ExentoNegativoDelDte si el IVA del DTE no cuadra con su total y el armado no es tolerante. */
  async armar(
    operador: Operador,
    fila: DteRecibido,
    opciones: OpcionesDelArmado,
  ): Promise<SolicitudConAvisos & { decisiones: DecisionesDelDte }> {
    const propuesta = await opciones.proponedor.proponer(fila);
    const { tasaDeIva } = await this.dependencias.configuracion.paraEmpresa(operador);
    const datosFiscales = datosFiscalesDe(fila, propuesta, opciones.datosFiscalesPorProveedor);
    const decisiones = decisionesDe(fila, propuesta, { datosFiscales, tasaDeIva });
    return { decisiones, ...solicitudDesdeElDte(fila, decisiones, { tolerante: opciones.tolerante ?? false }) };
  }
}
