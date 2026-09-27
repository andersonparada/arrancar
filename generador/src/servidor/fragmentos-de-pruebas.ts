import type { DefinicionDeRecurso } from '../definicion/definir-recurso.js';
import { conObjetoDeValor, lineas, rutaAlCore, type CampoDelServidor } from './campos-del-recurso.js';

const esUnico = ({ campo }: CampoDelServidor) => 'unico' in campo && campo.unico;

/** Lo que se cambia al editar en las pruebas: el campo que nombra al registro y los únicos. */
function cambioDePrueba(campos: CampoDelServidor[], mostrar: string): string {
  const cambiados = campos.filter((campo) => campo.nombreEnCodigo === mostrar || esUnico(campo));
  return `{ ${cambiados.map((campo) => `${campo.nombreEnCodigo}: ${campo.servidor.valoresDePrueba[1]}`).join(', ')} }`;
}

const esTextoObligatorio = ({ campo }: CampoDelServidor) =>
  (campo.tipo === 'texto' || campo.tipo === 'textoLargo') && campo.requerido;

/** La regla más simple que el dominio hace cumplir, para comprobarla; o ninguna. */
function reglaParaProbar(campos: CampoDelServidor[], { entidad }: DefinicionDeRecurso) {
  const texto = campos.find(esTextoObligatorio);
  if (texto) {
    return {
      importacion: `import { ${entidad.pascal}Invalido } from '../../../dominio/${entidad.clave}.js';\n`,
      error: `${entidad.pascal}Invalido`,
      caso: `no se registra sin "${texto.etiqueta}"`,
      dato: `{ ${texto.nombreEnCodigo}: '  ' }`,
    };
  }
  const conValor = conObjetoDeValor(campos)[0];
  if (!conValor) return null;
  const { clase, archivo } = conValor.servidor.objetoDeValor!;
  return {
    importacion: `import { ${clase}Invalido } from '${rutaAlCore(4)}/compartido/dominio/objetos-valor/${archivo}.js';\n`,
    error: `${clase}Invalido`,
    caso: `no acepta un ${conValor.etiqueta.toLowerCase()} que no es válido`,
    dato: `{ ${conValor.nombreEnCodigo}: 'no-es-valido' }`,
  };
}

function pruebaDeReglas(campos: CampoDelServidor[], definicion: DefinicionDeRecurso) {
  const regla = reglaParaProbar(campos, definicion);
  if (!regla) return { importacionDeReglas: '', pruebaDeReglas: '' };
  return {
    importacionDeReglas: regla.importacion,
    pruebaDeReglas: `
  it('${regla.caso}', async () => {
    const invalido = casos.crear.ejecutar(operador, solicitud(${regla.dato}));

    await expect(invalido).rejects.toThrow(${regla.error});
  });
`,
  };
}

/** Huecos de las pruebas unitarias y de API: datos válidos, el cambio y la regla a comprobar. */
export function fragmentosDePruebas(campos: CampoDelServidor[], definicion: DefinicionDeRecurso) {
  const mostrar = campos.find((campo) => campo.nombreEnCodigo === definicion.mostrar)!;
  return {
    solicitudDePrueba: lineas(campos.map((campo) => `${campo.nombreEnCodigo}: ${campo.servidor.valoresDePrueba[0]},`)),
    cambioDePrueba: cambioDePrueba(campos, definicion.mostrar),
    valorCambiado: mostrar.servidor.valoresDePrueba[1],
    ...pruebaDeReglas(campos, definicion),
  };
}
