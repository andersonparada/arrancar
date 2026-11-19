import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { ConceptoDeGastoInvalido, ValesDeGastoNoPermitidos } from '../../../dominio/errores-de-comprobantes.js';
import type { Fondo } from '../../../dominio/fondos.js';
import {
  exigirFechaDelComprobante,
  exigirMontoPositivo,
  exigirQueAlcanceElEfectivo,
} from '../../../dominio/reglas-de-comprobantes.js';
import { exigirFondoAbierto } from '../../../dominio/reglas-del-fondo.js';
import type { ResultadoDeAsignarDto } from '../../dto/comprobantes.dto.js';
import { LectorDelFondo } from '../fondos/lector-del-fondo.js';
import { comprobanteDto } from './armado-del-comprobante.js';
import { motivoDelTopeDelVale } from './excepciones-de-comprobantes.js';
import type { DependenciasDeComprobantes } from './dependencias-de-comprobantes.js';
import { efectivoEsperadoDelFondo, eventoDeAsignado } from './utilidades-de-comprobantes.js';

/** La clave del correlativo de los vales de gasto. */
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

/**
 * Registra un vale de gasto en un fondo abierto (`comprobantes.crear`, §5.4 d): un gasto menor sin factura, con su número
 * `caja-chica.vales`, a quién se pagó, el concepto de gasto y por qué no hay documento. Siempre no deducible. Pasar de su tope
 * (`caja-chica.vales_de_gasto.tope`) exige el permiso de excepción y un motivo. El efectivo debe alcanzar. Sin auditoría
 * (alta); publica `comprobante_asignado`.
 */
export class RegistrarValeDeGasto {
  private readonly lector: LectorDelFondo;

  constructor(private readonly dependencias: DependenciasDeComprobantes) {
    this.lector = new LectorDelFondo({ fondos: dependencias.fondos, consultas: dependencias.consultasDeFondos });
  }

  /**
   * @throws ValesDeGastoNoPermitidos, RecursoNoEncontrado, FondoNoDisponible, FechaDelComprobanteInvalida,
   * MontoDelComprobanteInvalido, ValeDeGastoSobreElTope, MotivoSobreElTopeObligatorio, ConceptoDeGastoInvalido,
   * ComprobantesMayoresQueElEfectivo
   */
  async ejecutar(operador: Operador, pedido: PeticionDeVale): Promise<ResultadoDeAsignarDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, eventos } = await unidadDeTrabajo.ejecutar(operador, () => this.registrar(operador, pedido));
    await publicadorEventos.publicar(eventos);
    return dto;
  }

  private async registrar(operador: Operador, pedido: PeticionDeVale) {
    const { comprobantes, correlativos } = this.dependencias;
    const fondo = await this.lector.bloquear(pedido.fondoId);
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
    });
    const vale = (await comprobantes.buscar(id))!;
    return { dto: { comprobantes: [comprobanteDto(vale)], avisos: [] }, eventos: [eventoDeAsignado(operador, vale)] };
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
