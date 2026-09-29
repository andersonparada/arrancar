import { auditarCambioDeEstado, type Auditoria } from '../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import type { SeccionesAportadas } from '../../../core/contratos/secciones.contratos.js';
import type { AlcanceDelOperador } from '../alcance-del-operador.js';
import { datosDeEmpresa } from '../datos-de-empresa.js';
import type { EmpresaDto, SolicitudDeEmpresa } from '../dto/empresa.dto.js';
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
}

export class ActualizarEmpresa {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * Se trabaja con la empresa editada como empresa de la transacción (puede no ser la activa), para que las
   * secciones de los demás módulos se guarden con la seguridad por filas de esa empresa.
   * @throws RecursoNoEncontrado si no es de la cuenta o el operador no tiene acceso a ella.
   * @throws NoSePuedeDesactivarLaEmpresaEnUso si se intenta desactivar la empresa activa.
   */
  ejecutar(operador: Operador, { empresaId, solicitud, secciones = {} }: CambioDeEmpresa): Promise<EmpresaDto> {
    const { unidadDeTrabajo, repositorio, consultas, alcance, avisos } = this.dependencias;
    const enLaEmpresa = { ...operador, empresaId };
    return unidadDeTrabajo.ejecutar(enLaEmpresa, async () => {
      const empresa = await repositorio.buscarEnCuenta(
        Identificador.desde(empresaId),
        Identificador.desde(operador.cuentaId),
      );
      if (!empresa) throw new RecursoNoEncontrado('La empresa');
      await alcance.exigirAcceso(operador, empresaId);
      const anterior = await consultas.obtenerEnCuenta(empresaId, operador.cuentaId);

      empresa.cambiarDatos(datosDeEmpresa(solicitud), Identificador.desde(operador.empresaId));
      await repositorio.actualizar(empresa);
      await this.auditar(anterior, solicitud.activa);
      await avisos.empresaGuardada(enLaEmpresa, { empresaId, secciones });
      return consultas.obtenerEnCuenta(empresaId, operador.cuentaId);
    });
  }

  private auditar(anterior: EmpresaDto, activaDespues: boolean): Promise<void> {
    return auditarCambioDeEstado(this.dependencias.auditoria, {
      recurso: 'empresas.empresas',
      registroId: anterior.id,
      anterior,
      activoAntes: anterior.activa,
      activoDespues: activaDespues,
    });
  }
}
