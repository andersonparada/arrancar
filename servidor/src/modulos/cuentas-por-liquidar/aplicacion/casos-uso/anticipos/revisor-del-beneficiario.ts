import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { numeroDelAnticipo } from '../../../dominio/anticipos.js';
import {
  AVISO_DE_FACTURAS_A_NOMBRE_DE_LA_EMPRESA,
  avisoDeBeneficiarioConVencidos,
} from '../../../dominio/avisos-de-anticipos.js';
import {
  BeneficiarioNoDisponible,
  BeneficiarioUsuarioInvalido,
  LocalidadDelAnticipoInvalida,
} from '../../../dominio/errores-de-anticipos.js';
import { beneficiarioDelCheque, motivoConVencidos } from '../../../dominio/reglas-del-anticipo.js';
import type { DependenciasDeAnticipos } from './dependencias-de-anticipos.js';
import type { PeticionDeAnticipo } from './peticion-de-anticipo.js';

/** Lo que resulta de revisar al beneficiario: su nombre, el motivo de la excepción y los avisos. */
export interface BeneficiarioRevisado {
  nombre: string;
  motivoConVencidos: string | null;
  avisos: string[];
}

type Dependencias = Pick<DependenciasDeAnticipos, 'referencias' | 'consultas' | 'politica'>;

/**
 * Revisa a quien recibe el anticipo antes de ordenar nada a Bancos: que el tercero sea de la cuenta y esté activo, que el
 * usuario (si lo hay) y la localidad (si la hay) sean de la empresa, y sus anticipos vencidos (CL-r): aviso, o rechazo con el
 * bloqueo encendido salvo el permiso de excepción y un motivo. A quien no es empleado se le avisa de la factura a nombre de la
 * empresa (C8).
 */
export class RevisorDelBeneficiario {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws BeneficiarioNoDisponible, BeneficiarioDelAnticipoInvalido, BeneficiarioUsuarioInvalido,
   * LocalidadDelAnticipoInvalida, BeneficiarioConVencidos, MotivoConVencidosObligatorio
   */
  async revisar(operador: Operador, pedido: PeticionDeAnticipo, hoy: string): Promise<BeneficiarioRevisado> {
    const nombre = await this.nombreDelTercero(pedido.beneficiarioId);
    await this.revisarReferencias(pedido);
    const vencidos = await this.dependencias.consultas.vencidosDe(pedido.beneficiarioId, hoy);
    const numeros = vencidos.map(({ numero, anioDeNumero }) => numeroDelAnticipo(numero, anioDeNumero));
    const motivo = motivoConVencidos({
      beneficiario: nombre,
      vencidos: numeros,
      bloquear: await this.dependencias.politica.bloquearConVencidos(operador),
      puedeConVencidos: pedido.puedeConVencidos,
      motivo: pedido.motivoConVencidos,
    });
    return { nombre, motivoConVencidos: motivo, avisos: avisosDelBeneficiario(pedido, nombre, numeros) };
  }

  private async nombreDelTercero(terceroId: string): Promise<string> {
    const nombre = await this.dependencias.referencias.nombreDelTercero(terceroId);
    if (nombre === null) throw new BeneficiarioNoDisponible();
    return beneficiarioDelCheque(nombre);
  }

  private async revisarReferencias(pedido: PeticionDeAnticipo): Promise<void> {
    const { referencias } = this.dependencias;
    const { beneficiarioUsuarioId, localidadId } = pedido;
    if (beneficiarioUsuarioId && !(await referencias.usuarioDeLaEmpresa(beneficiarioUsuarioId))) {
      throw new BeneficiarioUsuarioInvalido();
    }
    if (localidadId && !(await referencias.localidadDeLaEmpresa(localidadId))) throw new LocalidadDelAnticipoInvalida();
  }
}

function avisosDelBeneficiario(pedido: PeticionDeAnticipo, nombre: string, vencidos: readonly string[]): string[] {
  return [
    ...(vencidos.length > 0 ? [avisoDeBeneficiarioConVencidos(nombre, vencidos)] : []),
    ...(pedido.esEmpleado ? [] : [AVISO_DE_FACTURAS_A_NOMBRE_DE_LA_EMPRESA]),
  ];
}
