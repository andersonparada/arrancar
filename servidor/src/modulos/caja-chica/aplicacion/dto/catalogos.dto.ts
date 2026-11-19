/** Lo que Caja chica ofrece para elegir al abrir o mover un fondo y al registrar un vale; todo activo y por nombre. */
export interface OpcionDeCatalogoDto {
  id: string;
  nombre: string;
}

export interface ChequeraParaElFondoDto {
  id: string;
  cuentaBancariaNombre: string;
  serie: string | null;
  disponibles: number;
}

export interface CatalogosDeCajaChicaDto {
  cuentas: OpcionDeCatalogoDto[];
  chequeras: ChequeraParaElFondoDto[];
  localidades: OpcionDeCatalogoDto[];
  usuarios: OpcionDeCatalogoDto[];
  conceptosDeGasto: OpcionDeCatalogoDto[];
}
