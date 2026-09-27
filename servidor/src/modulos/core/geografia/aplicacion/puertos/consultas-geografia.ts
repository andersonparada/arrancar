export interface DepartamentoDto {
  codigo: string;
  nombre: string;
}

export interface MunicipioDto {
  departamentoCodigo: string;
  codigo: string;
  nombre: string;
}

/** Catálogo oficial del INE: departamentos y municipios de Guatemala. */
export interface ConsultasGeografia {
  listarDepartamentos(): Promise<DepartamentoDto[]>;
  listarMunicipios(departamentoCodigo: string): Promise<MunicipioDto[]>;
}
