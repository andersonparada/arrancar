import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import type { Comprobante } from '../../../dominio/comprobantes.js';
import { ConceptoDeGastoInvalido, ValesDeGastoNoPermitidos } from '../../../dominio/errores-de-comprobantes.js';
import type { Fondo } from '../../../dominio/fondos.js';
import {
  exigirFechaDelComprobante,
  exigirMontoPositivo,
  exigirQueAlcanceElEfectivo,
} from '../../../dominio/reglas-de-comprobantes.js';
import { exigirFondoAbierto } from '../../../dominio/reglas-del-fondo.js';
import type { DependenciasDeComprobantes } from './dependencias-de-comprobantes.js';
import { motivoDelTopeDelVale } from './excepciones-de-comprobantes.js';
import { efectivoEsperadoDelFondo, eventoDeAsignado } from './utilidades-de-comprobantes.js';

/** La clave del correlativo de los vales de gasto (y de los vales provisionales: comparten talonario). */
export const CLAVE_DE_VALES = 'caja-chica.vales';

export interface PeticionDeVale {
  fondoId: string;
  fecha?: string | null;
  monto: string;
  descripcion: string;
  pagadoA: string;
  conceptoDeGastoId: string;
  motivoSinDocumento: string;
  motivoSobreElTope?: string | null;
  /** El usuario tiene `caja-chica.comprobantes.sobre-el-tope`: lo pone el controlador. */
  puedeSobreElTope: boolean;
}

type Dependencias = Pick<
  DependenciasDeComprobantes,
  'comprobantes' | 'correlativos' | 'configuracion' | 'conceptos' | 'consultasDeFondos' | 'reloj'
>;

/**
 * Da de alta un vale de gasto en un fondo ya bloqueado (§5.4 d): número `caja-chica.vales`, a quién se pagó, concepto y por
 * qué no hay documento; siempre no deducible. Lo usan `RegistrarValeDeGasto` y la liquidación de un vale provisional.
 */
export class RegistradorDeValesDeGasto {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws ValesDeGastoNoPermitidos, FondoNoDisponible, FechaDelComprobanteInvalida, MontoDelComprobanteInvalido,
   * ValeDeGastoSobreElTope, MotivoSobreElTopeObligatorio, ConceptoDeGastoInvalido, ComprobantesMayoresQueElEfectivo
   */
  async registrar(
    operador: Operador,
    por: { pedido: PeticionDeVale; fondo: Fondo; valeProvisionalId?: string | null },
  ): Promise<{ comprobante: Comprobante; evento: EventoDominio }> {
    const { comprobantes, correlativos } = this.dependencias;
    const { pedido, fondo, valeProvisionalId = null } = por;
    const datos = await this.validar(operador, { pedido, fondo });
    const { numero, anio } = await correlativos.siguiente(CLAVE_DE_VALES, datos.fecha);
    const id = await comprobantes.agregarVale({
      fondoId: fondo.id,
      ...datos,
      descripcion: pedido.descripcion,
      pagadoA: pedido.pagadoA,
      conceptoDeGastoId: pedido.conceptoDeGastoId,
      motivoSinDocumento: pedido.motivoSinDocumento,
      numero,
      anioDeNumero: anio,
      asignadoPor: operador.usuarioId,
      valeProvisionalId,
    });
    const comprobante = (await comprobantes.buscar(id))!;
    return { comprobante, evento: eventoDeAsignado(operador, comprobante) };
  }

  /** Lo que se revisa antes de numerar y guardar; devuelve la fecha, el monto y el motivo del tope. */
  private async validar(operador: Operador, por: { pedido: PeticionDeVale; fondo: Fondo }) {
    const { pedido, fondo } = por;
    const { configuracion, conceptos, consultasDeFondos, reloj } = this.dependencias;
    const vales = await configuracion.valesDeGasto(operador);
    if (!vales.permitidos) throw new ValesDeGastoNoPermitidos();
    exigirFondoAbierto(fondo);
    const hoy = await reloj.hoy(operador);
    const fecha = pedido.fecha ?? hoy;
    exigirFechaDelComprobante(fecha, { hoy, fechaDeApertura: fondo.fechaDeApertura });
    const montoCentavos = exigirMontoPositivo(aCentavos(pedido.monto));
    const motivoSobreElTope = motivoDelTopeDelVale({
      montoCentavos,
      tope: vales.topeCentavos > 0 ? vales.topeCentavos : null,
      excepcion: { permitida: pedido.puedeSobreElTope, motivo: pedido.motivoSobreElTope },
    });
    if (!(await conceptos.estaActivo(pedido.conceptoDeGastoId))) throw new ConceptoDeGastoInvalido();
    exigirQueAlcanceElEfectivo(await efectivoEsperadoDelFondo(consultasDeFondos, fondo.id), montoCentavos);
    return { fecha, montoCentavos, motivoSobreElTope };
  }
}
