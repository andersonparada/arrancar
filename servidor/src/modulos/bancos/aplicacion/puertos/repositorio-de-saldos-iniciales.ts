/** La cabecera del saldo inicial de una cuenta: ancla sus partidas y guarda lo que el usuario transcribe para comparar. */
export interface CabeceraDeSaldoInicial {
  id: string;
  cuentaBancariaId: string;
  /** El saldo de la cuenta contable en los libros anteriores, solo para comparar; nulo = sin dato. */
  saldoSegunLibrosAnteriores: string | null;
  observaciones: string | null;
  /** El archivo de la evidencia (último estado de cuenta del sistema anterior), si se subió. */
  evidenciaArchivoId: string | null;
}

/** Lo que se escribe de la cabecera. */
export type DatosDeCabecera = Pick<CabeceraDeSaldoInicial, 'saldoSegunLibrosAnteriores' | 'observaciones'>;

/** Guarda la cabecera de los saldos iniciales. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioDeSaldosIniciales {
  /**
   * Bloquea la cuenta bancaria (`for update`) para que dos cargas de la misma cuenta no se crucen.
   * @throws RecursoNoEncontrado si la cuenta no existe o es de otra empresa.
   * @returns si la cuenta está activa.
   */
  bloquearCuenta(cuentaBancariaId: string): Promise<{ activa: boolean }>;
  /** La cabecera de la cuenta, bloqueada para este caso de uso; `null` si no tiene saldo inicial. */
  buscarDeLaCuenta(cuentaBancariaId: string): Promise<CabeceraDeSaldoInicial | null>;
  agregar(empresaId: string, cuentaBancariaId: string, datos: DatosDeCabecera): Promise<CabeceraDeSaldoInicial>;
  guardar(cabecera: CabeceraDeSaldoInicial): Promise<void>;
  eliminar(id: string): Promise<void>;
  /** Pone (o quita, con `null`) el archivo de la evidencia de la cabecera. */
  ponerEvidencia(id: string, archivoId: string | null): Promise<void>;
}
