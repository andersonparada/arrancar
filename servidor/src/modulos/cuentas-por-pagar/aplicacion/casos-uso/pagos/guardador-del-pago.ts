import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { NumeroAsignado } from '../../../../core/compartido/aplicacion/correlativos.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { EFECTO_DE_LA_DIFERENCIA_DE_UN_CARGO } from '../../../dominio/ajustes.js';
import type { DocumentoConAplicaciones, DocumentoPorPagar } from '../../../dominio/documento-por-pagar.js';
import { AjusteRegistrado } from '../../../dominio/eventos-de-ajustes.js';
import { numeroDelPago } from '../../../dominio/pagos.js';
import { CLAVE_DE_PAGOS, retencionPorDescontar, type DiferenciaPedida } from '../../../dominio/registro-de-pago.js';
import { dtoDeFicha } from '../../dto/ficha-del-documento.dto.js';
import type { PagoDto } from '../../dto/registro-de-pago.dto.js';
import type { AjusteNuevo } from '../../puertos/puertos-de-ajustes.js';
import type { MovimientoCreado } from '../../puertos/puertos-de-pagos.js';
import { dtoDelPago, eventoDelPago, type PagoGuardado } from './armado-del-pago.js';
import { ArmadorDeAvisosDelPago, type LineaConRetencion } from './avisos-del-pago.js';
import { RECURSO_DE_AJUSTES, type DependenciasDeRegistrarPago, type LineaRevisada } from './dependencias-de-pagos.js';
import type { PeticionDePago } from './peticion-de-pago.js';
import type { PagoBloqueado } from './revisor-del-pago.js';

/** Todo lo que `RegistrarPago` ya resolvió antes de guardar. */
export interface PagoPorGuardar {
  pedido: PeticionDePago;
  pagoId: string;
  fecha: string;
  hoy: string;
  beneficiario: string;
  movimiento: MovimientoCreado;
  bloqueado: PagoBloqueado;
  diferencias: DiferenciaPedida[];
  fechaDeInicio: string | null;
}

export interface PagoYSusEventos {
  dto: PagoDto;
  eventos: EventoDominio[];
}

/** Guarda el pago y sus líneas, las diferencias de centavos y arma lo que se responde y se publica. */
export class GuardadorDelPago {
  private readonly avisos: ArmadorDeAvisosDelPago;

  constructor(private readonly dependencias: DependenciasDeRegistrarPago) {
    this.avisos = new ArmadorDeAvisosDelPago(dependencias);
  }

  async guardar(operador: Operador, por: PagoPorGuardar): Promise<PagoYSusEventos> {
    const lineas = await this.conRetencion(por.bloqueado.lineas);
    // Antes de insertar: lo pagado en el mes que se compara con el umbral no incluye este pago.
    const avisos = await this.avisosDe(operador, por, lineas);
    const asignado = await this.dependencias.correlativos.siguiente(CLAVE_DE_PAGOS, por.fecha);
    await this.insertar(por, lineas, asignado);
    const ajustes = await this.guardarDiferencias(operador, por, numeroDelPago(asignado.numero, asignado.anio));
    const guardado: PagoGuardado = {
      empresaId: operador.empresaId,
      pagoId: por.pagoId,
      numero: { numero: asignado.numero, anio: asignado.anio },
      pedido: por.pedido,
      fecha: por.fecha,
      hoy: por.hoy,
      beneficiario: por.beneficiario,
      movimiento: por.movimiento,
      lineas,
      diferencias: por.diferencias,
      avisos,
    };
    return { dto: dtoDelPago(guardado), eventos: [eventoDelPago(guardado), ...ajustes] };
  }

  private insertar(por: PagoPorGuardar, lineas: LineaConRetencion[], asignado: NumeroAsignado): Promise<void> {
    const { pedido } = por;
    return this.dependencias.pagos.agregar({
      id: por.pagoId,
      proveedorId: pedido.proveedorId,
      numero: asignado.numero,
      anioDeNumero: asignado.anio,
      forma: pedido.forma,
      fecha: por.fecha,
      movimientoId: por.movimiento.movimientoId,
      observaciones: pedido.observaciones ?? null,
      lineas: lineas.map(({ fila, contrasena, montoCentavos, retencionDescontadaCentavos }) => ({
        cargoId: fila.documento.id,
        contrasenaId: contrasena.id,
        montoCentavos,
        retencionDescontadaCentavos,
      })),
    });
  }

  private async avisosDe(operador: Operador, por: PagoPorGuardar, lineas: LineaConRetencion[]): Promise<string[]> {
    const propios = await this.avisos.avisos(operador, {
      forma: por.pedido.forma,
      proveedorId: por.pedido.proveedorId,
      proveedorNombre: lineas[0]!.fila.libro.proveedorNombre,
      fecha: por.fecha,
      hoy: por.hoy,
      fechaDeInicio: por.fechaDeInicio,
      lineas,
      diferencias: por.diferencias,
    });
    return [...propios, ...por.movimiento.avisos.map(({ mensaje }) => mensaje)];
  }

  /** A cada línea, las retenciones del cargo si este es su primer pago vigente; si no, cero. */
  private async conRetencion(lineas: readonly LineaRevisada[]): Promise<LineaConRetencion[]> {
    const ya = await this.dependencias.pagos.conRetencionYaDescontada(lineas.map(({ fila }) => fila.documento.id));
    return lineas.map((linea) => ({
      ...linea,
      retencionDescontadaCentavos: retencionPorDescontar(linea.fila.documento, ya.has(linea.fila.documento.id)),
    }));
  }

  /** Las diferencias de centavos: un ajuste del cargo ligado al pago, auditado y con su evento (efecto `ingreso`). */
  private async guardarDiferencias(operador: Operador, por: PagoPorGuardar, numero: string): Promise<EventoDominio[]> {
    const eventos: EventoDominio[] = [];
    for (const diferencia of por.diferencias)
      eventos.push(await this.guardarUna(operador, por, { diferencia, numero }));
    return eventos;
  }

  private auditar(ajusteId: string, guardado: DocumentoConAplicaciones, motivo: string): Promise<void> {
    return this.dependencias.auditoria.registrar({
      recurso: RECURSO_DE_AJUSTES,
      registroId: ajusteId,
      accion: 'ajustar',
      anterior: dtoDeFicha(guardado),
      motivo,
    });
  }

  private async guardarUna(
    operador: Operador,
    por: PagoPorGuardar,
    { diferencia, numero }: { diferencia: DiferenciaPedida; numero: string },
  ): Promise<AjusteRegistrado> {
    const guardado = por.bloqueado.guardados.get(diferencia.cargoId)!;
    const { documento } = guardado;
    const motivo = `Diferencia al pagar con el pago ${numero}`;
    const ajusteId = await this.dependencias.ajustes.agregar(documento, ajusteDeLaDiferencia(por, diferencia, motivo));
    await this.auditar(ajusteId, guardado, motivo);
    return new AjusteRegistrado({
      ...datosDelDocumento(documento),
      empresaId: operador.empresaId,
      ajusteId,
      montoCentavos: diferencia.montoCentavos,
      fecha: por.fecha,
      causa: 'diferencia_menor',
      efecto: EFECTO_DE_LA_DIFERENCIA_DE_UN_CARGO,
      referencia: null,
    });
  }
}

const ajusteDeLaDiferencia = (
  por: PagoPorGuardar,
  { montoCentavos }: DiferenciaPedida,
  motivo: string,
): AjusteNuevo => ({
  montoCentavos,
  fecha: por.fecha,
  causa: 'diferencia_menor',
  motivo,
  referencia: null,
  pagoId: por.pagoId,
});

const datosDelDocumento = ({ id, proveedorId, serie, numero }: DocumentoPorPagar) => ({
  documentoId: id,
  proveedorId,
  serie,
  numero,
});
