import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { AvisoDeBancos } from '../../../../core/contratos/bancos.contratos.js';
import type { OrdenesEntreModulos } from '../../../../core/contratos/mediador.contratos.js';
import { fechaDeCorte } from '../../../dominio/apertura.js';
import { aCentavos, deCentavos } from '../../../dominio/centavos.js';
import { nombreDelModulo } from '../../../dominio/conceptos-reservados.js';
import { MontoDistintoDelCheque } from '../../../dominio/errores-de-cheque-de-apertura.js';
import { ModuloDeOrigenInactivo } from '../../../dominio/errores-de-origen.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { avisoDeBeneficiarioDistinto, avisoDePosfechadoCobradoPronto } from '../../avisos-de-cheque-de-apertura.js';
import type { DesgloseDeMovimientos } from '../../desglose-de-movimientos.js';
import type { MovimientoDto } from '../../dto/movimiento.dto.js';
import type { CargaInicial } from '../../puertos/carga-inicial.js';
import type { ConsultasDeSugerencias } from '../../puertos/consultas-de-sugerencias.js';
import type { ConsultasMovimientos } from '../../puertos/consultas-movimientos.js';
import type { ModulosDeOrigen } from '../../puertos/modulos-de-origen.js';
import type { RepositorioMovimientos } from '../../puertos/repositorio-movimientos.js';

type Orden = OrdenesEntreModulos['bancos.ligar_cheque_de_apertura'];

export interface DependenciasDeLigarChequeDeApertura {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasMovimientos;
  repositorio: RepositorioMovimientos;
  desglose: DesgloseDeMovimientos;
  auditoria: Auditoria;
  modulosDeOrigen: ModulosDeOrigen;
  cargaInicial: CargaInicial;
  consultasDeSugerencias: Pick<ConsultasDeSugerencias, 'nombreParaComparar'>;
}

/**
 * La orden `bancos.ligar_cheque_de_apertura` (diseño CP-AP §2.7): el posfechado de la carga inicial pasa a ser del
 * pago que lo pide, con el concepto por clave y su reparto. Deja rastro (`corregir` en `bancos.cheques`) con el
 * movimiento como estaba. Los avisos no bloquean.
 */
export class LigarChequeDeApertura {
  constructor(private readonly dependencias: DependenciasDeLigarChequeDeApertura) {}

  /**
   * @throws RecursoNoEncontrado si el movimiento no existe.
   * @throws ModuloDeOrigenInactivo si el módulo que lo pide está apagado.
   * @throws ChequeDeAperturaNoLigable si no es un posfechado de apertura vigente y sin origen.
   * @throws MontoDistintoDelCheque si el monto del pago no es el del cheque.
   * @throws DesgloseSinLineas, ConceptoDeDesgloseIncompatible o DesgloseNoSuma si las líneas no sirven.
   */
  ejecutar(operador: Operador, datos: Orden['datos']): Promise<Orden['respuesta']> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      await this.exigirModuloActivo(operador, datos.origen.modulo);
      const anterior = await this.ligar(operador, datos);
      return this.respuesta(operador, anterior, datos);
    });
  }

  /** Liga el movimiento y deja el rastro; devuelve el cheque como estaba. */
  private async ligar(operador: Operador, datos: Orden['datos']): Promise<MovimientoDto> {
    const { repositorio, consultas, desglose, auditoria } = this.dependencias;
    const movimiento = await repositorio.bloquear(Identificador.desde(datos.movimientoId));
    if (!movimiento) throw new RecursoNoEncontrado('El movimiento');
    const anterior = await consultas.obtener(datos.movimientoId);
    this.exigirMontoIgual(anterior, datos.montoCentavos);
    const { tipo, monto } = anterior;
    const reparto = await desglose.resolver(operador, { tipo, monto, lineas: datos.conceptos });
    movimiento.ligarChequeDeApertura(datos.origen, reparto.principalId);
    await repositorio.guardar(movimiento);
    const conceptoDelMovimientoId = reparto.principalId;
    await desglose.guardar(operador, { movimientoId: anterior.id, conceptoDelMovimientoId, reparto });
    const motivo = `Ligado al pago ${datos.origen.documentoId} de ${nombreDelModulo(datos.origen.modulo)}`;
    await auditoria.registrar({
      recurso: 'bancos.cheques',
      registroId: anterior.id,
      accion: 'corregir',
      anterior,
      motivo,
    });
    return anterior;
  }

  private async exigirModuloActivo(operador: Operador, modulo: string): Promise<void> {
    if (!(await this.dependencias.modulosDeOrigen.estaActivo(operador, modulo)))
      throw new ModuloDeOrigenInactivo(modulo);
  }

  private exigirMontoIgual(cheque: MovimientoDto, montoCentavos: number): void {
    if (aCentavos(cheque.monto) !== montoCentavos)
      throw new MontoDistintoDelCheque(cheque.monto, deCentavos(montoCentavos));
  }

  private async respuesta(
    operador: Operador,
    cheque: MovimientoDto,
    datos: Orden['datos'],
  ): Promise<Orden['respuesta']> {
    return {
      numeroDeCheque: cheque.numeroDeCheque as number,
      fecha: cheque.fecha,
      cuentaBancariaId: cheque.cuentaBancariaId,
      avisos: await this.avisos(operador, cheque, datos.beneficiarioEsperado),
    };
  }

  private async avisos(operador: Operador, cheque: MovimientoDto, esperado: string): Promise<AvisoDeBancos[]> {
    const { consultasDeSugerencias, consultas, cargaInicial } = this.dependencias;
    const avisos: AvisoDeBancos[] = [];
    const delCheque = await consultasDeSugerencias.nombreParaComparar(cheque.beneficiario);
    if (delCheque !== (await consultasDeSugerencias.nombreParaComparar(esperado))) {
      avisos.push(avisoDeBeneficiarioDistinto(cheque.beneficiario, esperado));
    }
    if (await consultas.marcadoEnLaPrimeraConciliacion(cheque.id)) {
      const { fechaDeInicio } = await cargaInicial.obtener(operador);
      avisos.push(avisoDePosfechadoCobradoPronto(fechaDeInicio ? fechaDeCorte(fechaDeInicio) : null));
    }
    return avisos;
  }
}
