import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type { PublicadorEventos } from '../../../core/compartido/aplicacion/publicador-eventos.js';
import type { UnidadDeTrabajo } from '../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import { Empresa } from '../../dominio/empresa.js';
import { datosDeEmpresa } from '../datos-de-empresa.js';
import type { EmpresaDto, SolicitudDeEmpresa } from '../dto/empresa.dto.js';
import type { AccesosAEmpresas } from '../puertos/accesos-a-empresas.js';
import type { ConsultasEmpresas } from '../puertos/consultas-empresas.js';
import type { RepositorioEmpresas } from '../puertos/repositorio-empresas.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioEmpresas;
  consultas: ConsultasEmpresas;
  accesos: AccesosAEmpresas;
  publicadorEventos: PublicadorEventos;
}

/**
 * Registra una empresa en la cuenta del operador. Quien la crea entra a ella con
 * el mismo rol que tiene en la empresa donde está trabajando (soporte no, porque
 * no es miembro de ninguna).
 */
export class RegistrarEmpresa {
  constructor(private readonly dependencias: Dependencias) {}

  async ejecutar(operador: Operador, solicitud: SolicitudDeEmpresa): Promise<EmpresaDto> {
    const { unidadDeTrabajo, consultas, publicadorEventos } = this.dependencias;
    const empresa = Empresa.registrar(Identificador.desde(operador.cuentaId), datosDeEmpresa(solicitud));

    const registrada = await unidadDeTrabajo.ejecutar(operador, async () => {
      await this.dependencias.repositorio.agregar(empresa);
      await this.darAccesoAlCreador(operador, empresa);
      return consultas.obtenerEnCuenta(empresa.id.valor, operador.cuentaId);
    });
    await publicadorEventos.publicar(empresa.extraerEventos());
    return registrada;
  }

  private async darAccesoAlCreador(operador: Operador, empresa: Empresa): Promise<void> {
    const { accesos } = this.dependencias;
    const rolId = await accesos.rolEnEmpresa(operador.usuarioId, operador.empresaId);
    if (rolId) await accesos.darAcceso({ empresaId: empresa.id.valor, usuarioId: operador.usuarioId, rolId });
  }
}
