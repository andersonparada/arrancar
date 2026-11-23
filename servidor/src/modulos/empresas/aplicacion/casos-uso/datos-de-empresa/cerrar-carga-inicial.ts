import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { CargaInicial } from '../../../dominio/carga-inicial.js';
import {
  FechaDeInicioRequerida,
  MotivoDeCierreRequerido,
  RevisionDeCierreDesactualizada,
} from '../../../dominio/errores.js';
import type { CargaInicialDto, RevisionDeCierreDto } from '../../dto/datos-de-empresa.dto.js';
import { ArmadorDeLaRevision } from './armador-de-la-revision.js';
import type { DependenciasDeDatosDeEmpresa } from './dependencias.js';
import { exigirAbierta } from './revisar-cierre-de-carga-inicial.js';

interface CierreSolicitado {
  empresaId: string;
  /** Obligatorio si la revisión tiene hallazgos que piden motivo; si se escribe, se audita. */
  motivo?: string | null;
  /** La huella de la revisión que vio quien cierra: si ya cambió, se rechaza. */
  huella?: string | null;
}

/** Cómo era la carga y qué se revisó al cerrarla: lo que queda en la auditoría (versionado para leerlo después). */
function descripcionDelCierre({ carga, modulos, diferencias, avisos, huella }: RevisionDeCierreDto) {
  const { balanceDeApertura } = carga;
  return {
    version: 1,
    carga: { empresaId: carga.empresaId, fechaDeInicio: carga.fechaDeInicio },
    revision: { modulos, diferencias, avisos, huella },
    balanceDeApertura: balanceDeApertura && {
      sha256: balanceDeApertura.sha256,
      nombreOriginal: balanceDeApertura.nombreOriginal,
      paginas: balanceDeApertura.paginas,
      tamanoBytes: balanceDeApertura.tamanoBytes,
      subidoEn: balanceDeApertura.subidoEn,
      subidoPorNombre: balanceDeApertura.subidoPorNombre,
    },
  };
}

export class CerrarCargaInicial {
  private readonly armador: ArmadorDeLaRevision;

  constructor(private readonly dependencias: DependenciasDeDatosDeEmpresa) {
    this.armador = new ArmadorDeLaRevision(dependencias.preguntas);
  }

  /**
   * Cierra la carga inicial: la fecha de inicio queda fija y los módulos ya no aceptan saldos iniciales. Vuelve a
   * revisar dentro de la transacción (con la carga bloqueada) y deja el cierre en la auditoría con lo revisado.
   * @throws FechaDeInicioRequerida si aún no se registró la fecha de inicio.
   * @throws CargaInicialCerrada si ya estaba cerrada.
   * @throws MotivoDeCierreInvalido si el motivo solo tiene espacios o pasa de 500 caracteres.
   * @throws RevisionDeCierreDesactualizada si llegó una huella y ya no coincide con la revisión.
   * @throws MotivoDeCierreRequerido si la revisión tiene diferencias y no hay motivo.
   * @throws RecursoNoEncontrado si la empresa no es de la cuenta o el operador no tiene acceso a ella.
   */
  ejecutar(operador: Operador, cierre: CierreSolicitado): Promise<CargaInicialDto> {
    const { ejecutorEnEmpresa, repositorioCargas, consultas, auditoria } = this.dependencias;
    const { empresaId } = cierre;
    return ejecutorEnEmpresa.ejecutar(operador, empresaId, async () => {
      const carga = await repositorioCargas.buscar(Identificador.desde(empresaId));
      if (!carga) throw new FechaDeInicioRequerida();
      carga.exigirAbierta();
      const { revision, motivo } = await this.revisarParaCerrar(operador, cierre);

      carga.cerrar({ cerradaEn: new Date(), cerradaPor: operador.usuarioId });
      await repositorioCargas.guardar(carga);
      await this.dependencias.avisos.cargaPorCerrar(
        { ...operador, empresaId },
        { empresaId, fechaDeInicio: carga.instantanea().fechaDeInicio },
      );
      await auditoria.registrar({
        recurso: 'empresas.cargas-iniciales',
        registroId: empresaId,
        accion: 'cerrar',
        anterior: descripcionDelCierre(revision),
        motivo,
      });
      return consultas.cargaInicial(empresaId);
    });
  }

  /** Vuelve a revisar y comprueba el motivo y la huella; devuelve lo que se va a guardar. */
  private async revisarParaCerrar(operador: Operador, { empresaId, motivo, huella }: CierreSolicitado) {
    const motivoLimpio = CargaInicial.motivoDeCierre(motivo);
    const carga = exigirAbierta(await this.dependencias.consultas.cargaInicial(empresaId));
    const revision = await this.armador.armar(operador, carga);
    if (huella && huella !== revision.huella) throw new RevisionDeCierreDesactualizada(revision);
    if (revision.pideMotivo && !motivoLimpio) throw new MotivoDeCierreRequerido(revision);
    return { revision, motivo: motivoLimpio };
  }
}
