import type { CuentaBancariaDto, SolicitudDeCuentaBancaria } from '../dto/cuenta-bancaria.dto.js';

/** Lecturas para pantallas: devuelven datos planos, sin reconstruir entidades. */
export interface ConsultasCuentasBancarias {
  listar(): Promise<CuentaBancariaDto[]>;
  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  obtener(cuentaBancariaId: string): Promise<CuentaBancariaDto>;
  /** @throws RecursoNoEncontrado si algo que se eligió no existe o es ajeno. */
  exigirReferencias(solicitud: SolicitudDeCuentaBancaria): Promise<void>;
}
