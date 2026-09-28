import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { validadorDeZod } from '../../core/intercambio/http/rutas-de-intercambio.js';
import { ActualizarBanco } from '../aplicacion/casos-uso/bancos/actualizar-banco.js';
import { CrearBanco } from '../aplicacion/casos-uso/bancos/crear-banco.js';
import { ListarBancos } from '../aplicacion/casos-uso/bancos/listar-bancos.js';
import { ObtenerBanco } from '../aplicacion/casos-uso/bancos/obtener-banco.js';
import type { BancoDto, SolicitudDeBanco } from '../aplicacion/dto/banco.dto.js';
import { columnasDeBancos } from '../http/bancos.columnas.js';
import { BancosControlador } from '../http/bancos.controlador.js';
import { esquemaBanco } from '../http/bancos.esquemas-http.js';
import { rutasBancos } from '../http/bancos.rutas.js';
import { ConsultasBancosDrizzle } from '../infraestructura/persistencia/consultas-bancos.drizzle.js';
import { RepositorioBancosDrizzle } from '../infraestructura/persistencia/repositorio-bancos.drizzle.js';

const dependenciasDeBancos = () => ({
  unidadDeTrabajo: dependenciasCompartidas().unidadDeTrabajo,
  auditoria: dependenciasCompartidas().auditoria,
  repositorio: new RepositorioBancosDrizzle(),
  consultas: new ConsultasBancosDrizzle(),
});

type Dependencias = ReturnType<typeof dependenciasDeBancos>;

const casosDeUso = (dependencias: Dependencias) => ({
  listar: new ListarBancos(dependencias),
  obtener: new ObtenerBanco(dependencias),
  crear: new CrearBanco(dependencias),
  actualizar: new ActualizarBanco(dependencias),
});

/** Exportar e importar en Excel; cada fila importada pasa por las mismas reglas que el formulario. */
function intercambioDeBancos(casos: ReturnType<typeof casosDeUso>, _dependencias: Dependencias) {
  return crearIntercambio<BancoDto, SolicitudDeBanco>({
    nombre: 'Bancos',
    columnas: columnasDeBancos(),
    validar: validadorDeZod(esquemaBanco),
    listar: (operador) => casos.listar.ejecutar(operador),
    crear: (operador, solicitud) => casos.crear.ejecutar(operador, solicitud),
  });
}

/** Raíz de composición de los bancos: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeBancos() {
  const dependencias = dependenciasDeBancos();
  const casos = casosDeUso(dependencias);
  return rutasBancos(new BancosControlador(casos), intercambioDeBancos(casos, dependencias));
}
