import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { exigirMontoPositivo } from '../../../dominio/reglas-de-comprobantes.js';
import { exigirFondoAbierto } from '../../../dominio/reglas-del-fondo.js';
import { ReceptorDelValeInvalido } from '../../../dominio/errores-de-vales-provisionales.js';
import {
  exigirFechaDelVale,
  exigirQueAlcanceParaElVale,
  nombreDelReceptor,
} from '../../../dominio/reglas-de-vales-provisionales.js';
import type { ValeProvisionalDto } from '../../dto/vales-provisionales.dto.js';
import { CLAVE_DE_VALES } from '../comprobantes/registrador-de-vales-de-gasto.js';
import { efectivoEsperadoDelFondo } from '../comprobantes/utilidades-de-comprobantes.js';
import { LectorDelFondo } from '../fondos/lector-del-fondo.js';
import type { DependenciasDeVales } from './dependencias-de-vales.js';
import { LectorDeVales } from './lector-de-vales.js';

export interface PeticionDeEntregarVale {
  fondoId: string;
  fecha?: string | null;
  monto: string;
  /** Quién recibe el efectivo: un nombre o un usuario de la empresa. */
  entregadoA?: string | null;
  entregadoAUsuarioId?: string | null;
  motivo: string;
}

/**
 * Entrega un vale provisional (`vales.crear`, §5.5): efectivo que sale de la caja del fondo hacia alguien, por justificar.
 * El monto no pasa del efectivo esperado; el número sale del talonario `caja-chica.vales`, el mismo de los vales de gasto.
 * Sin auditoría (alta) ni evento: no hay partida, es un movimiento dentro del fondo.
 */
export class EntregarVale {
  private readonly lectorDelFondo: LectorDelFondo;
  private readonly lector: LectorDeVales;

  constructor(private readonly dependencias: DependenciasDeVales) {
    this.lectorDelFondo = new LectorDelFondo({
      fondos: dependencias.fondos,
      consultas: dependencias.consultasDeFondos,
    });
    this.lector = new LectorDeVales(dependencias);
  }

  /**
   * @throws RecursoNoEncontrado, FondoNoDisponible, FechaDelValeInvalida, MontoDelComprobanteInvalido,
   * ValeMayorQueElEfectivo, ReceptorDelValeObligatorio, ReceptorDelValeInvalido
   */
  ejecutar(operador: Operador, pedido: PeticionDeEntregarVale): Promise<ValeProvisionalDto> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, () => this.entregar(operador, pedido));
  }

  private async entregar(operador: Operador, pedido: PeticionDeEntregarVale): Promise<ValeProvisionalDto> {
    const { vales, correlativos, consultasDeFondos, reloj } = this.dependencias;
    const fondo = await this.lectorDelFondo.bloquear(pedido.fondoId);
    exigirFondoAbierto(fondo);
    const hoy = await reloj.hoy(operador);
    const fecha = pedido.fecha ?? hoy;
    exigirFechaDelVale(fecha, { hoy, fechaDeApertura: fondo.fechaDeApertura });
    const montoCentavos = exigirMontoPositivo(aCentavos(pedido.monto));
    exigirQueAlcanceParaElVale(await efectivoEsperadoDelFondo(consultasDeFondos, fondo.id), montoCentavos);
    const receptor = await this.receptor(pedido);
    const { numero, anio } = await correlativos.siguiente(CLAVE_DE_VALES, fecha);
    const id = await vales.agregar({
      fondoId: fondo.id,
      numero,
      anioDeNumero: anio,
      fecha,
      entregadoA: receptor.nombre,
      entregadoAUsuarioId: receptor.usuarioId,
      montoCentavos,
      motivo: pedido.motivo.trim(),
    });
    return this.lector.leer(operador, (await vales.buscar(id))!);
  }

  private async receptor(pedido: PeticionDeEntregarVale) {
    const usuarioId = pedido.entregadoAUsuarioId ?? null;
    const delUsuario = usuarioId === null ? null : await this.dependencias.usuarios.nombreDelUsuario(usuarioId);
    if (usuarioId !== null && delUsuario === null) throw new ReceptorDelValeInvalido();
    return { nombre: nombreDelReceptor(pedido.entregadoA, delUsuario), usuarioId };
  }
}
