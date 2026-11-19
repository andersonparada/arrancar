import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { CustodioInvalido } from '../../../dominio/errores-de-fondos.js';
import { FondoAbierto } from '../../../dominio/eventos-de-fondos.js';
import {
  beneficiarioDelFondo,
  exigirFechaNoFutura,
  exigirMontoPositivo,
  exigirNombreDelFondo,
  exigirTope,
  nombreDelCustodio,
} from '../../../dominio/reglas-del-fondo.js';
import type { FondoDto } from '../../dto/fondos.dto.js';
import { NombreDeFondoRepetido } from '../../errores-de-fondos.js';
import type { MovimientoCreado } from '../../puertos/puertos-de-bancos.js';
import type { DependenciasDeFondos } from './dependencias-de-fondos.js';
import { LectorDelFondo } from './lector-del-fondo.js';
import { ordenarLaEntrega, type PeticionDeEntrega } from './orden-de-entrega.js';

/** Los datos del fondo; el dinero de la apertura va en la entrega (cheque o nota de débito). */
interface DatosDelFondoNuevo {
  nombre: string;
  localidadId?: string | null;
  /** Quién lleva el efectivo; con `custodioUsuarioId` se toma el nombre del usuario. */
  custodio?: string | null;
  custodioUsuarioId?: string | null;
  /** Nulo o vacío: se usa el de la empresa. */
  topePorComprobante?: string | null;
}

export type PeticionDeApertura = PeticionDeEntrega & DatosDelFondoNuevo;

interface Custodio {
  nombre: string;
  usuarioId: string | null;
}

/** La apertura ya validada, lista para ordenar a Bancos y guardar. */
interface DatosDeLaApertura {
  fondoId: string;
  fecha: string;
  nombre: string;
  montoCentavos: number;
  topeCentavos: number | null;
  custodio: Custodio;
  beneficiario: string;
}

/** Lo que ya se validó y lo que respondió Bancos, listo para guardar. */
interface AperturaPorGuardar {
  pedido: PeticionDeApertura;
  datos: DatosDeLaApertura;
  movimiento: MovimientoCreado;
}

/**
 * Abre un fondo (`fondos.crear`): ordena a Bancos el cheque (a nombre del custodio o de quien se escriba, nunca al portador
 * y «no negociable» por omisión) o la nota de débito, con el fondo como origen y el concepto «Fondo de caja chica»; si
 * Bancos lanza (saldo, chequera, mes conciliado), nada se guarda. Guarda el fondo, su primer custodio (que, si es usuario,
 * recibe el acceso al fondo por el disparador de la base) y la apertura. Responde con los avisos de Bancos y publica
 * `fondo_abierto` al confirmar.
 */
export class AbrirFondo {
  private readonly lector: LectorDelFondo;

  constructor(private readonly dependencias: DependenciasDeFondos) {
    this.lector = new LectorDelFondo(dependencias);
  }

  /**
   * @throws FechaDelFondoInvalida, MontoDelFondoInvalido, NombreDelFondoInvalido, TopeDelFondoInvalido,
   * CustodioObligatorio, CustodioInvalido, BeneficiarioInvalido, NombreDeFondoRepetido, RecursoNoEncontrado (localidad)
   * y lo que rechace Bancos.
   */
  async ejecutar(operador: Operador, pedido: PeticionDeApertura): Promise<FondoDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, eventos } = await unidadDeTrabajo.ejecutar(operador, () => this.abrir(operador, pedido));
    await publicadorEventos.publicar(eventos);
    return dto;
  }

  private async abrir(operador: Operador, pedido: PeticionDeApertura) {
    const hoy = await this.dependencias.reloj.hoy(operador);
    const datos = await this.validar(pedido, hoy);
    const movimiento = await ordenarLaEntrega(this.dependencias.bancos, operador, { pedido, datos });
    await this.guardar({ pedido, datos, movimiento });
    const fondo = (await this.dependencias.fondos.buscar(datos.fondoId))!;
    const avisos = movimiento.avisos.map(({ mensaje }) => mensaje);
    return {
      dto: await this.lector.leer(fondo, avisos),
      eventos: [this.evento(operador, { pedido, datos, movimiento })],
    };
  }

  /** Lo que se valida antes de ordenar nada a Bancos. */
  private async validar(pedido: PeticionDeApertura, hoy: string): Promise<DatosDeLaApertura> {
    const fecha = pedido.fecha ?? hoy;
    exigirFechaNoFutura(fecha, hoy);
    const nombre = exigirNombreDelFondo(pedido.nombre);
    const montoCentavos = exigirMontoPositivo(aCentavos(pedido.monto));
    const topeCentavos = exigirTope(pedido.topePorComprobante ? aCentavos(pedido.topePorComprobante) : null);
    const custodio = await this.custodio(pedido);
    const beneficiario =
      pedido.forma === 'cheque' ? beneficiarioDelFondo(pedido.beneficiario, custodio.nombre) : custodio.nombre;
    await this.exigirDisponibles(pedido, nombre);
    return { fondoId: crypto.randomUUID(), fecha, nombre, montoCentavos, topeCentavos, custodio, beneficiario };
  }

  private async exigirDisponibles(pedido: PeticionDeApertura, nombre: string): Promise<void> {
    const { fondos, referencias } = this.dependencias;
    if (await fondos.existeElNombre(nombre)) throw new NombreDeFondoRepetido();
    await referencias.exigirLocalidad(pedido.localidadId);
    if (pedido.forma === 'nota_de_debito') await referencias.exigirCuentaBancaria(pedido.cuentaBancariaId);
  }

  private async custodio(pedido: PeticionDeApertura): Promise<Custodio> {
    const usuarioId = pedido.custodioUsuarioId ?? null;
    const delUsuario = usuarioId === null ? null : await this.dependencias.custodios.nombreDelUsuario(usuarioId);
    if (usuarioId !== null && delUsuario === null) throw new CustodioInvalido();
    return { nombre: nombreDelCustodio(pedido.custodio, delUsuario), usuarioId };
  }

  private async guardar(por: AperturaPorGuardar) {
    const { fondos } = this.dependencias;
    const { pedido, datos, movimiento } = por;
    await fondos.agregar({
      id: datos.fondoId,
      nombre: datos.nombre,
      localidadId: pedido.localidadId ?? null,
      topeCentavos: datos.topeCentavos,
      cuentaBancariaId: movimiento.cuentaBancariaId,
      fechaDeApertura: datos.fecha,
    });
    await this.guardarCustodioYApertura(por);
  }

  private async guardarCustodioYApertura({ pedido, datos, movimiento }: AperturaPorGuardar) {
    const { fondos } = this.dependencias;
    const { fondoId, fecha, custodio } = datos;
    await fondos.agregarCustodio({
      fondoId,
      custodio: custodio.nombre,
      custodioUsuarioId: custodio.usuarioId,
      desde: fecha,
      motivoDelCambio: null,
    });
    await fondos.agregarCambio({
      fondoId,
      tipo: 'apertura',
      forma: pedido.forma,
      fecha,
      montoCentavos: datos.montoCentavos,
      movimientoId: movimiento.movimientoId,
    });
  }

  private evento(operador: Operador, por: AperturaPorGuardar): EventoDominio {
    const { pedido, datos, movimiento } = por;
    return new FondoAbierto({
      empresaId: operador.empresaId,
      fondoId: datos.fondoId,
      nombre: datos.nombre,
      fecha: datos.fecha,
      montoCentavos: datos.montoCentavos,
      forma: pedido.forma,
      movimientoId: movimiento.movimientoId,
      cuentaBancariaId: movimiento.cuentaBancariaId,
      custodio: datos.custodio.nombre,
      custodioUsuarioId: datos.custodio.usuarioId,
    });
  }
}
