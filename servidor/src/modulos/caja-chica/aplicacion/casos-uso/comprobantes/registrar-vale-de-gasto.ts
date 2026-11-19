import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ResultadoDeAsignarDto } from '../../dto/comprobantes.dto.js';
import { LectorDelFondo } from '../fondos/lector-del-fondo.js';
import { comprobanteDto } from './armado-del-comprobante.js';
import type { DependenciasDeComprobantes } from './dependencias-de-comprobantes.js';
import { RegistradorDeValesDeGasto, type PeticionDeVale } from './registrador-de-vales-de-gasto.js';

export { CLAVE_DE_VALES, type PeticionDeVale } from './registrador-de-vales-de-gasto.js';

/**
 * Registra un vale de gasto en un fondo abierto (`comprobantes.crear`, §5.4 d): un gasto menor sin factura, con su número
 * `caja-chica.vales`, a quién se pagó, el concepto de gasto y por qué no hay documento. Siempre no deducible. Pasar de su tope
 * (`caja-chica.vales_de_gasto.tope`) exige el permiso de excepción y un motivo. El efectivo debe alcanzar. Sin auditoría
 * (alta); publica `comprobante_asignado`.
 */
export class RegistrarValeDeGasto {
  private readonly lector: LectorDelFondo;
  private readonly registrador: RegistradorDeValesDeGasto;

  constructor(private readonly dependencias: DependenciasDeComprobantes) {
    this.lector = new LectorDelFondo({ fondos: dependencias.fondos, consultas: dependencias.consultasDeFondos });
    this.registrador = new RegistradorDeValesDeGasto(dependencias);
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
    const fondo = await this.lector.bloquear(pedido.fondoId);
    const { comprobante, evento } = await this.registrador.registrar(operador, { pedido, fondo });
    return { dto: { comprobantes: [comprobanteDto(comprobante)], avisos: [] }, eventos: [evento] };
  }
}
