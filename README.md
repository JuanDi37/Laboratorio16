# Lab 16 — Pear, Hyperswarm y Hypercore

Sesión 19.

## Título y objetivo

Analizar descubrimiento e intercambio entre peers y el efecto de retirar la fuente inicial durante una transferencia.

## Instrucciones

En este laboratorio trabajamos en Visual Studio Code para estudiar una arquitectura peer-to-peer del ecosistema Pear, Hyperswarm y Hypercore mediante un informe técnico y una simulación educativa independiente. Definimos un topic de demostración de treinta y dos bytes para explicar cómo dos peers se anuncian y buscan participantes mediante una DHT, sin atribuir una unión al topic real de clase cuando ese identificador no está disponible. Describimos la función de los nodos bootstrap, las condiciones de conectividad y el establecimiento de sockets entre participantes, y presentamos un intercambio de mensajes con delimitación explícita para evitar interpretar fragmentos de transporte como mensajes completos. Analizamos la creación de un Hypercore, su clave pública, la autenticación de bloques y la replicación de datos entre un escritor y sus lectores. Modelamos la transferencia de un archivo pequeño y desarrollamos el experimento kill-seeder, comparando la interrupción antes de completar la descarga con la presencia de una réplica íntegra en otro peer. Contrastamos centralización, disponibilidad y responsabilidad mediante los casos Napster, Grokster y BitTorrent, sin suponer que distribución técnica elimina obligaciones. Elaboramos P2P.md con arquitectura e infraestructura, señalamos la visibilidad de información de conexión y entregamos HTML, CSS, JavaScript y README con diagramas, terminal ilustrativa, resultados del modelo y conclusiones sobre descubrimiento, replicación y privacidad.

## Descripción del trabajo

Dos diagramas explican infraestructura y estados del archivo. El terminal interactivo descubre peers, intercambia un saludo y transfiere cuatro bloques lógicos. Se puede desconectar el seeder y añadir una réplica completa; P2P.md desarrolla la arquitectura.

## Tecnologías

Pear como entorno, Hyperswarm para descubrimiento y conexión, Hypercore para registro autenticado, DHT y nodos bootstrap. HTML, CSS y JavaScript realizan una simulación local.

## Resultados

La transferencia se detiene sin una fuente de bloques faltantes y continúa con una réplica íntegra. El modelo no se une al topic real de clase ni mide conexiones. La comparación histórica distingue arquitectura, disponibilidad y responsabilidad.

## Aprendizaje

Aprendimos a separar descubrimiento, transporte y replicación, y a interpretar la disponibilidad a partir de bloques concretos. El modelo kill-seeder nos permitió comprender por qué la resiliencia depende de copias útiles y peers activos, y por qué una aplicación sin servidor central todavía necesita infraestructura y reglas de responsabilidad.

## Visualización

Abrimos la carpeta WEB3-LABS en Visual Studio Code. Con la extensión Live Server instalada, hacemos clic derecho en este index.html y elegimos **Open with Live Server**. La navegación principal está en ../index.html. Usamos localhost para Web Crypto; no se necesitan cuentas ni credenciales. Los controles se operan con Tab, Enter y Espacio.

## Rúbrica original

- Unión al topic de clase mediante Hyperswarm: 20%.
- Intercambio de mensajes P2P entre dos peers: 25%.
- Transferencia de archivo y análisis kill-seeder: 20%.
- P2P.md con arquitectura, infraestructura y responsabilidad: 25%.
- Comentarios de aprendizaje: 10%.

Total: 100%. Los alcances y límites se describen en la tabla HTML; no se asignan calificaciones por ejecuciones no realizadas.

## Alcance académico

Las simulaciones se identifican en pantalla; no representan conexiones, publicaciones ni transacciones externas. No se proporcionaron penalizaciones adicionales y no se inventan deducciones. participantes autorizados, archivo inocuo y distinción entre distribución técnica y anonimato.

## Fuentes primarias

- [Pear · documentación del ecosistema](https://docs.pears.com/)
- [Hyperswarm · API oficial](https://github.com/holepunchto/hyperswarm)
- [Hypercore · API oficial](https://github.com/holepunchto/hypercore)
- [BitTorrent · BEP 3](https://www.bittorrent.org/beps/bep_0003.html)
- [Grokster · resolución judicial histórica](https://cdn.ca9.uscourts.gov/datastore/opinions/2005/08/15/0355894o.pdf)
