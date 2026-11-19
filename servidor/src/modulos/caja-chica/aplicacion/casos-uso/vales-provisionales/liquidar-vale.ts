import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { efectoEnLoPendiente } from '../../../dominio/reglas-de-comprobantes.js';
import { exigirFondoAbierto } from '../../../dominio/reglas-del-fondo.js';
import {
  devueltoDelVale,
  exigirFechaDeLiquidacion,
  exigirValeAbierto,
} from '../../../dominio/reglas-de-vales-provisionales.js';
import type { Fondo } from '../../../dominio/fondos.js';
import type { ValeProvisional } from '../../../dominio/vales-provisionales.js';
import type { ValeProvisionalDto } from '../../dto/vales-provisionales.dto.js';
import type { PermisosDeExcepcion } from '../comprobantes/asignador-de-comprobantes.js';
import {
  AsignadorDeDocumentos,
  type DocumentoCargado,
  type DocumentoPorAsignar,
} from '../comprobantes/asignador-de-documentos.js';
import { RegistradorDeValesDeGasto, type PeticionDeVale } from '../comprobantes/registrador-de-vales-de-gasto.js';
import { LectorDelFondo } from '../fondos/lector-del-fondo.js';
import type { DependenciasDeVales } from './dependencias-de-vales.js';
import { LectorDeVales } from './lector-de-vales.js';

/** Un vale de gasto que justifica el vale provisional; el fondo y el permiso los pone el caso de uso. */
export type GastoSinDocumento = Omit<PeticionDeVale, 'fondoId' | 'puedeSobreElTope'>;

export interface PeticionDeLiquidarVale {
  valeId: string;
  /** El día de la liquidación; hoy si falta. */
  fecha?: string | null;
  /** Documentos de la bandeja con los que se justifica el gasto. */
  documentos: DocumentoPorAsignar[];
  /** Vales de gasto (sin factura) con los que se justifica el gasto. */
  valesDeGasto: GastoSinDocumento[];
  /** Los permisos de excepción de quien liquida: los pone el controlador con los de la sesión. */
  permisos: PermisosDeExcepcion;
}

/**
 * Liquida un vale provisional (`vales.liquidar`, §5.5): se le asignan documentos de la bandeja y vales de gasto (cada uno
 * lleva el `vale_provisional_id`) y lo que sobró regresa a la caja: `devuelto = max(0, monto - gastado)`. Si se gastó de más,
 * la diferencia salió de la caja del fondo y la ecuación sigue cuadrando. Todo o nada, en una transacción: el vale se libera
 * primero (deja de contar como vale abierto) y cada comprobante pasa las reglas de siempre (tope, retención, bancarización y
 * que el efectivo alcance). Quien liquida no necesita `comprobantes.crear`. Publica `comprobante_asignado` por cada uno.
 */
export class LiquidarVale {
  private readonly lectorDelFondo: LectorDelFondo;
  private readonly lector: LectorDeVales;
  private readonly documentos: AsignadorDeDocumentos;
  private readonly registrador: RegistradorDeValesDeGasto;

  constructor(private readonly dependencias: DependenciasDeVales) {
    this.lectorDelFondo = new LectorDelFondo({
      fondos: dependencias.fondos,
      consultas: dependencias.consultasDeFondos,
    });
    this.lector = new LectorDeVales(dependencias);
    this.documentos = new AsignadorDeDocumentos(dependencias);
    this.registrador = new RegistradorDeValesDeGasto(dependencias);
  }

  /**
   * @throws RecursoNoEncontrado, FondoNoDisponible, ValeNoEstaAbierto, FechaDelValeInvalida y lo que rechacen los
   * comprobantes (`ComprobantesMayoresQueElEfectivo`, `ComprobanteSobreElTope`, `RetencionSinPermiso`…): no se asigna nada.
   */
  async ejecutar(operador: Operador, pedido: PeticionDeLiquidarVale): Promise<ValeProvisionalDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, eventos } = await unidadDeTrabajo.ejecutar(operador, () => this.liquidar(operador, pedido));
    await publicadorEventos.publicar(eventos);
    return dto;
  }

  private async liquidar(operador: Operador, pedido: PeticionDeLiquidarVale) {
    const { vale, fondo } = await this.bloquear(pedido.valeId);
    const cargados = await this.documentos.cargar(pedido.documentos);
    const hoy = await this.dependencias.reloj.hoy(operador);
    const fecha = pedido.fecha ?? hoy;
    exigirFechaDeLiquidacion(fecha, { hoy, vale });
    const gastado = gastadoDe(cargados, pedido.valesDeGasto);
    await this.dependencias.vales.liquidar(vale.id, {
      devueltoCentavos: devueltoDelVale(vale.montoCentavos, gastado),
      fechaDeLiquidacion: fecha,
      liquidadoPor: operador.usuarioId,
    });
    const { avisos, eventos } = await this.justificar(operador, { pedido, cargados, fondo, valeId: vale.id });
    const liquidado = (await this.dependencias.vales.buscar(vale.id))!;
    return { dto: await this.lector.leer(operador, liquidado, avisos), eventos };
  }

  private async bloquear(valeId: string): Promise<{ vale: ValeProvisional; fondo: Fondo }> {
    const visible = await this.lector.buscar(valeId);
    const fondo = await this.lectorDelFondo.bloquear(visible.fondoId);
    exigirFondoAbierto(fondo);
    const vale = await this.dependencias.vales.bloquear(valeId);
    if (!vale) throw new RecursoNoEncontrado('El vale provisional');
    exigirValeAbierto(vale);
    return { vale, fondo };
  }

  /** Asigna los documentos y registra los vales de gasto, todos atados al vale. */
  private async justificar(
    operador: Operador,
    por: { pedido: PeticionDeLiquidarVale; cargados: DocumentoCargado[]; fondo: Fondo; valeId: string },
  ): Promise<{ avisos: string[]; eventos: EventoDominio[] }> {
    const { pedido, cargados, fondo, valeId } = por;
    const { permisos } = pedido;
    const asignados = await this.documentos.asignar(operador, { cargados, fondo, permisos, valeProvisionalId: valeId });
    const eventos = [...asignados.eventos];
    for (const gasto of pedido.valesDeGasto) {
      const pedidoDelGasto = { ...gasto, fondoId: fondo.id, puedeSobreElTope: permisos.sobreElTope };
      const { evento } = await this.registrador.registrar(operador, {
        pedido: pedidoDelGasto,
        fondo,
        valeProvisionalId: valeId,
      });
      eventos.push(evento);
    }
    return { avisos: asignados.avisos, eventos };
  }
}

/** Lo que gastaron los comprobantes de la liquidación: los cargos suman y las notas de crédito restan. */
function gastadoDe(documentos: readonly DocumentoCargado[], vales: readonly GastoSinDocumento[]): number {
  const deDocumentos = documentos.reduce((suma, { comprobante }) => suma + efectoEnLoPendiente(comprobante), 0);
  return vales.reduce((suma, { monto }) => suma + aCentavos(monto), deDocumentos);
}
