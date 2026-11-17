import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { Reintegro } from '../../../dominio/reintegros.js';
import { dtoDelRecibo } from '../../dto/dto-de-reintegros.js';
import type { ReciboDeReintegroDto, ReintegroDto } from '../../dto/reintegros.dto.js';
import type { DependenciasDeReintegros } from './dependencias-de-reintegros.js';
import { LectorDelReintegro } from './lector-del-reintegro.js';

async function reintegroExistente(dependencias: DependenciasDeReintegros, id: string): Promise<Reintegro> {
  const reintegro = await dependencias.reintegros.buscar(id);
  if (!reintegro) throw new RecursoNoEncontrado('El reintegro');
  return reintegro;
}

/** La ficha de un reintegro, vigente o anulado. */
export class ObtenerReintegro {
  private readonly lector: LectorDelReintegro;

  constructor(private readonly dependencias: DependenciasDeReintegros) {
    this.lector = new LectorDelReintegro(dependencias);
  }

  /** @throws RecursoNoEncontrado */
  ejecutar(operador: Operador, id: string): Promise<ReintegroDto> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () =>
      this.lector.leer(await reintegroExistente(this.dependencias, id)),
    );
  }
}

/**
 * El «Recibo de reintegro» (C-CP4-6): empresa, proveedor con el nombre de su NIT, número, fecha, forma (cuenta y boleta, o
 * el recibo de caja), notas con serie y número, total en números y letras, firmas y la leyenda de que no es un documento
 * tributario. Un reintegro anulado también se imprime, con su estado.
 */
export class ReciboDeReintegro {
  private readonly lector: LectorDelReintegro;

  constructor(private readonly dependencias: DependenciasDeReintegros) {
    this.lector = new LectorDelReintegro(dependencias);
  }

  /** @throws RecursoNoEncontrado */
  ejecutar(operador: Operador, id: string): Promise<ReciboDeReintegroDto> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      const reintegro = await reintegroExistente(this.dependencias, id);
      const dto = await this.lector.leer(reintegro);
      const nombreDelNit = await this.dependencias.nombreDelNit.de(
        reintegro.proveedorId,
        reintegro.notas.map(({ notaId }) => notaId),
      );
      return dtoDelRecibo(dto, {
        empresa: await this.dependencias.empresa.obtener(operador),
        nombreDelNit: nombreDelNit ?? dto.proveedor.nombre,
        cuentaBancaria: dto.movimiento?.cuentaBancariaNombre ?? null,
        totalCentavos: reintegro.montoCentavos,
      });
    });
  }
}
