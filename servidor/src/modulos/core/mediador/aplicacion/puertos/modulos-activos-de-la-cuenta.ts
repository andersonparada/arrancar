/** Qué módulos puede usar una cuenta ahora mismo: los que contrató más los esenciales y sus dependencias. */
export interface ModulosActivosDeLaCuenta {
  activosPara(cuentaId: string): Promise<ReadonlySet<string>>;
}
