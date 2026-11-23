import { auditarCambioDeEstado, type Auditoria } from '../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import type { SeccionesAportadas } from '../../../core/contratos/secciones.contratos.js';
import type { AlcanceDelOperador } from '../alcance-del-operador.js';
import { auditarElCambioDeNit, exigirParaCambiarElNit } from '../cambio-de-nit-auditado.js';
import { avisosDeNitRepetido } from '../avisar-nit-repetido.js';
import { datosDeEmpresa } from '../datos-de-empresa.js';
import type { EmpresaConAvisosDto, EmpresaDto, SolicitudDeEmpresa } from '../dto/empresa.dto.js';
import type { AvisosDeEmpresa } from '../puertos/avisos-de-empresa.js';
import type { ConsultasEmpresas } from '../puertos/consultas-empresas.js';
import type { RepositorioEmpresas } from '../puertos/repositorio-empresas.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioEmpresas;
  consultas: ConsultasEmpresas;
  alcance: AlcanceDelOperador;
  auditoria: Auditoria;
  avisos: AvisosDeEmpresa;
}

interface CambioDeEmpresa {
  empresaId: string;
  solicitud: SolicitudDeEmpresa;
  /** Lo que otros módulos aportan al formulario; se guarda en la misma transacción. */
  secciones?: SeccionesAportadas;
  /** El operador tiene `empresas.nit.corregir`: sin él no puede quitar ni reemplazar el NIT (A-10). */
  puedeCorregirNit: boolean;
  /** Por qué se quita o reemplaza el NIT; obligatorio en ese caso. */
  motivoDelNit?: string | null;
}

export class ActualizarEmpresa {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * Se trabaja con la empresa editada como empresa de la transacción (puede no ser la activa), para que las
   * secciones de los demás módulos se guarden con la seguridad por filas de esa empresa.
   * @throws RecursoNoEncontrado si no es de la cuenta o el operador no tiene acceso a ella.
   * @throws NoSePuedeDesactivarLaEmpresaEnUso si se intenta desactivar la empresa activa.
   * @throws AccesoDenegado si quita o reemplaza el NIT sin `empresas.nit.corregir`.
   * @throws FaltaElMotivoDelCambioDeNit si lo quita o reemplaza sin motivo.
   */
  ejecutar(operador: Operador, cambio: CambioDeEmpresa): Promise<EmpresaConAvisosDto> {
    const { empresaId, secciones = {} } = cambio;
    const { unidadDeTrabajo, repositorio, consultas, alcance, avisos } = this.dependencias;
    const enLaEmpresa = { ...operador, empresaId };
    return unidadDeTrabajo.ejecutar(enLaEmpresa, async () => {
      await alcance.exigirAcceso(operador, empresaId);
      const empresa = await repositorio.buscarEnCuenta(
        Identificador.desde(empresaId),
        Identificador.desde(operador.cuentaId),
      );
      if (!empresa) throw new RecursoNoEncontrado('La empresa');
      const anterior = await consultas.obtenerEnCuenta(empresaId, operador.cuentaId);
      const motivoDelNit = exigirParaCambiarElNit(anterior, this.datosDelNit(cambio));

      empresa.cambiarDatos(datosDeEmpresa(cambio.solicitud), Identificador.desde(operador.empresaId));
      await repositorio.actualizar(empresa);
      await this.auditar(anterior, cambio.solicitud, motivoDelNit.motivo);
      await avisos.empresaGuardada(enLaEmpresa, { empresaId, secciones });
      const guardada = await consultas.obtenerEnCuenta(empresaId, operador.cuentaId);
      return {
        ...guardada,
        avisos: await avisosDeNitRepetido(consultas, { ...guardada, cuentaId: operador.cuentaId }),
      };
    });
  }

  private datosDelNit({ solicitud, puedeCorregirNit, motivoDelNit }: CambioDeEmpresa) {
    return { nitNuevo: solicitud.nit, puedeCorregir: puedeCorregirNit, motivo: motivoDelNit };
  }

  /** El cambio de estado (inactivar o reactivar) y el cambio de NIT, cada uno con su rastro. */
  private async auditar(anterior: EmpresaDto, solicitud: SolicitudDeEmpresa, motivo: string | null): Promise<void> {
    const { auditoria } = this.dependencias;
    await auditarCambioDeEstado(auditoria, {
      recurso: 'empresas.empresas',
      registroId: anterior.id,
      anterior,
      activoAntes: anterior.activa,
      activoDespues: solicitud.activa,
    });
    if (anterior.nit !== solicitud.nit) {
      await auditarElCambioDeNit(auditoria, { anterior, nitNuevo: solicitud.nit, motivo });
    }
  }
}
