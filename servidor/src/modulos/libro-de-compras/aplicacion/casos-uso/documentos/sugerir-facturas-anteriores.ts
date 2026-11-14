import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { dtoDeFacturaAnterior, type FacturaAnteriorDto } from '../../dto/factura-anterior.dto.js';
import type { DatosDeLaEmpresaParaDocumentos, ProveedoresParaDocumentos } from '../../puertos/puertos-de-documentos.js';
import type {
  DteAnterioresParaSugerir,
  RepositorioDeFacturasAnteriores,
} from '../../puertos/puertos-de-facturas-anteriores.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  proveedores: ProveedoresParaDocumentos;
  empresa: DatosDeLaEmpresaParaDocumentos;
  facturasAnteriores: RepositorioDeFacturasAnteriores;
  dteAnteriores: DteAnterioresParaSugerir;
}

/** Las facturas del sistema anterior que se pueden proponer al registrar una nota de un proveedor. */
export interface SugerenciasDeFacturasAnteriores {
  /** La fecha de inicio de la empresa; `null` si no tiene (entonces no hay sugerencias de la bandeja). */
  fechaDeInicio: string | null;
  /** Las que ya citan notas del proveedor. */
  usadas: FacturaAnteriorDto[];
  /** DTE de factura de la bandeja, anteriores a la fecha de inicio, que todavía ninguna nota cita. */
  deLaBandeja: FacturaAnteriorDto[];
}

/** Con qué se reconoce una factura del proveedor: serie y número. */
const claveDe = ({ serie, numero }: { serie: string | null; numero: string }) => `${serie ?? ''}|${numero}`;

/**
 * Propone, para llenar el formulario de una nota con un clic, las facturas anteriores que ya citan notas del proveedor
 * y los DTE de factura de su bandeja emitidos antes de la fecha de inicio. Solo lee.
 */
export class SugerirFacturasAnteriores {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws RecursoNoEncontrado si el proveedor no es de la cuenta. */
  ejecutar(operador: Operador, proveedorId: string): Promise<SugerenciasDeFacturasAnteriores> {
    const { unidadDeTrabajo, proveedores, empresa, facturasAnteriores, dteAnteriores } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const proveedor = await proveedores.buscar(proveedorId);
      if (!proveedor) throw new RecursoNoEncontrado('El proveedor');
      const usadas = await facturasAnteriores.citadasPorElProveedor(proveedorId);
      const fechaDeInicio = await empresa.fechaDeInicio(operador);
      const delDte = fechaDeInicio
        ? await dteAnteriores.deFactura({ proveedorId, nit: proveedor.nit, fechaDeInicio })
        : [];
      const yaUsadas = new Set(usadas.map(claveDe));
      return {
        fechaDeInicio,
        usadas: usadas.map(dtoDeFacturaAnterior),
        deLaBandeja: delDte.filter((dte) => !yaUsadas.has(claveDe(dte))).map(dtoDeFacturaAnterior),
      };
    });
  }
}
