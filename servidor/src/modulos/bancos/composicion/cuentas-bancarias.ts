import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { validadorDeZod } from '../../core/intercambio/http/rutas-de-intercambio.js';
import { opcionesDe } from '../../core/intercambio/aplicacion/columnas.js';
import { ConsultasBancosDrizzle } from '../infraestructura/persistencia/consultas-bancos.drizzle.js';
import { ActualizarCuentaBancaria } from '../aplicacion/casos-uso/cuentas-bancarias/actualizar-cuenta-bancaria.js';
import { CrearCuentaBancaria } from '../aplicacion/casos-uso/cuentas-bancarias/crear-cuenta-bancaria.js';
import { ListarCuentasBancarias } from '../aplicacion/casos-uso/cuentas-bancarias/listar-cuentas-bancarias.js';
import { ObtenerCuentaBancaria } from '../aplicacion/casos-uso/cuentas-bancarias/obtener-cuenta-bancaria.js';
import type { CuentaBancariaDto, SolicitudDeCuentaBancaria } from '../aplicacion/dto/cuenta-bancaria.dto.js';
import { columnasDeCuentasBancarias } from '../http/cuentas-bancarias.columnas.js';
import { CuentasBancariasControlador } from '../http/cuentas-bancarias.controlador.js';
import { esquemaCuentaBancaria } from '../http/cuentas-bancarias.esquemas-http.js';
import { rutasCuentasBancarias } from '../http/cuentas-bancarias.rutas.js';
import { ConsultasCuentasBancariasDrizzle } from '../infraestructura/persistencia/consultas-cuentas-bancarias.drizzle.js';
import { RepositorioCuentasBancariasDrizzle } from '../infraestructura/persistencia/repositorio-cuentas-bancarias.drizzle.js';

const dependenciasDeCuentasBancarias = () => ({
  unidadDeTrabajo: dependenciasCompartidas().unidadDeTrabajo,
  auditoria: dependenciasCompartidas().auditoria,
  repositorio: new RepositorioCuentasBancariasDrizzle(),
  consultas: new ConsultasCuentasBancariasDrizzle(),
});

type Dependencias = ReturnType<typeof dependenciasDeCuentasBancarias>;

const casosDeUso = (dependencias: Dependencias) => ({
  listar: new ListarCuentasBancarias(dependencias),
  obtener: new ObtenerCuentaBancaria(dependencias),
  crear: new CrearCuentaBancaria(dependencias),
  actualizar: new ActualizarCuentaBancaria(dependencias),
});

/** Exportar e importar en Excel; cada fila importada pasa por las mismas reglas que el formulario. */
function intercambioDeCuentasBancarias(casos: ReturnType<typeof casosDeUso>, _dependencias: Dependencias) {
  return crearIntercambio<CuentaBancariaDto, SolicitudDeCuentaBancaria>({
    nombre: 'Cuentas bancarias',
    columnas: columnasDeCuentasBancarias({ bancoId: opcionesDe(new ConsultasBancosDrizzle(), 'nombre') }),
    validar: validadorDeZod(esquemaCuentaBancaria),
    listar: (operador) => casos.listar.ejecutar(operador),
    crear: (operador, solicitud) => casos.crear.ejecutar(operador, solicitud),
  });
}

/** Raíz de composición de las cuentas bancarias: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeCuentasBancarias() {
  const dependencias = dependenciasDeCuentasBancarias();
  const casos = casosDeUso(dependencias);
  return rutasCuentasBancarias(
    new CuentasBancariasControlador(casos),
    intercambioDeCuentasBancarias(casos, dependencias),
  );
}
