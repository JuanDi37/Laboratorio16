# LAB #16 · P2P sin servidor de aplicación

Carnet: **20230285**. Venture: **PactTrail**, contratos inteligentes que liberan un pago cuando se completan tareas. Stack implementado: Node.js (fallback autorizado), Hyperswarm, HyperDHT y Hypercore. Pear es el runtime del ecosistema; no se afirmó haber instalado Pear ni ejecutado `pear init`. Topic propuesto: `cs031-s19-20261013`; debe coincidir con el acordado por ambos compañeros.

## 1. Qué se construyó y qué se observó

El repositorio contiene dos flujos independientes: un chat de kickoff y la replicación de un archivo. Ambos usan discovery P2P, mientras el HTML presenta la evidencia. El servidor HTTP opcional sirve este informe en localhost; no participa en el intercambio. Las ejecuciones producen JSONL, con timestamps UTC, keys de peers truncadas, mensajes y endpoints observables. Los resultados reales aparecen abajo; una ausencia de logs se presenta como pendiente.

<!-- EVIDENCE:START -->
**Estado:** Kickoff entre compañeros pendiente: no hay mensajes correlacionados de ambos lados.

Topic propuesto `cs031-s19-20261013`; topicId corto `5f12612ab966`.

- Clase: 0 conexiones registradas; 0 mensajes recibidos; 0 envíos correlacionados con recepción en otro runId; 0 archivos verificados.
- Local: 0 conexiones; 0 mensajes correlacionados; 0 archivos verificados. No representan la red del aula.
- Kill observado por controlador: 0 eventos. Experimento pendiente; no se infiere un resultado.
- Preparación: 4 fallos de instalación/disponibilidad registrados; no equivalen a no peers en Hyperswarm.

- [evidence/2026-10-13T14-41-37-590Z-check-d103a480.jsonl](evidence/2026-10-13T14-41-37-590Z-check-d103a480.jsonl): 4 eventos.
- [evidence/preparation.jsonl](evidence/preparation.jsonl): 1 eventos.
- [evidence/validation.jsonl](evidence/validation.jsonl): 4 eventos.
<!-- EVIDENCE:END -->

La evidencia entre procesos locales se etiqueta por separado. No representa dos alumnos, sus NAT o la red del aula. Tampoco se infiere que un fallo de instalación sea un timeout de discovery. Cuando tengamos ambos logs de clase, se deben cotejar mensajes por identificador y comparar los topicId. Un `connection` solo demuestra transporte; recepción y ack añaden evidencia del intercambio. El log del compañero sigue siendo necesario.

## 2. Discovery → transporte → datos

```text
Texto compartido: cs031-s19-20261013
                │ SHA-256, 32 bytes
                ▼
         topic de Hyperswarm
                │ join({server:true, client:true})
                ▼
bootstrap conocido → HyperDHT: anunciar y buscar peers
                │ contactos y coordinación de conectividad
                ▼
    intento de conexión / holepunch si hace falta
                │ ruta disponible; relay posible según red
                ▼
     socket cifrado Noise, public key del peer
                ├── chat: frames ping / ack con delimitador LF
                └── archivo: Hypercore replica manifest + bloques
                         │ verificación y reconstrucción
                         ▼
                  tamaño + SHA-256 coincidentes
```

El topic identifica un interés común, no un host ni un secreto. Para archivos se usa `core.discoveryKey`, topic diferente al de chat; la public key del core se comparte por coordinación humana. Esa key permite verificar el registro; no autoriza escribir. La Noise public key identifica una conexión, mientras el carnet dentro del ping es una declaración de identidad.

Como intuición de discovery, Kademlia organiza IDs con distancia XOR y contactos en k-buckets. Un lookup consulta nodos próximos a la key y refina sus candidatos. Esto distribuye el descubrimiento; no asegura privacidad, disponibilidad del contenido ni resistencia absoluta a Sybil o eclipse. Bootstrap y contactos siguen siendo necesarios. [Paper original de Kademlia](https://pdos.csail.mit.edu/~petar/papers/maymounkov-kademlia-lncs.pdf).

El código no implementa Kademlia desde cero: delega a HyperDHT. Hyperswarm anuncia y busca el topic en modo server+client. Cuando se emite connection, captura el endpoint expuesto por socket/rawStream. No registra “holepunch exitoso” ni “directo” basándose únicamente en esa conexión. [API de Hyperswarm](https://docs.pears.com/p2p/reference/building-blocks/hyperswarm/).

## 3. Infraestructura que permanece

En ejecución pública, HyperDHT configura por defecto `node1.hyperdht.org:49737`, `node2.hyperdht.org:49737` y `node3.hyperdht.org:49737`, según su documentación. Son puntos de entrada, no un provider que guarda este archivo. Configurarlos no demuestra que los tres respondieron; los logs distinguen configuración de observación. Se necesitan red UDP, DNS o direcciones conocidas, routers/NAT, runtime, energía, disco y peers disponibles. [HyperDHT: bootstrap e infraestructura](https://github.com/holepunchto/hyperdht).

El experimento local automático usa un bootstrap y un nodo persistente propios en loopback; sus puertos quedan registrados. No configura relays. En Internet puede intervenir infraestructura adicional de conectividad; si la API no permite saberlo, el informe dice **no determinado**. No se inventa el operador de un relay ni se concluye que no hubo ninguno.

“Zero-infra” describe retirar el servidor de aplicación que media los bits; el costo se reparte. La privacidad también cambia: el cifrado protege payloads en tránsito, pero el otro extremo puede observar su endpoint y los tiempos. Ambos conocen el topic que compartieron. No se supone que cada peer pueda listar todas las IP del swarm ni que el topic derive identidad. P2P no promete anonimato.

## 4. Archivo y pérdida del seeder

El generador produce texto sintético propio: **786432 bytes**, sin personas ni obra ajena. Se mantiene debajo de 1 MB. El core contiene un manifest y bloques de 16 KiB. La replicación autentica los bloques y el downloader compara el SHA-256 del archivo reconstruido. El procedimiento y el estado están en [KILL-SEEDER.md](KILL-SEEDER.md); los logs se enlazan desde [index.html](index.html).

El controlador solicita bloques secuenciales con pausas y mata el seeder cerca de 50%. Registra por separado bytes consumidos y recibidos: una barra al 50% no prueba que queden bytes en red. Si se recibió todo antes del kill, el experimento no demuestra continuidad de disponibilidad. El contraste agrega un peer que descargó todo y queda sirviendo. Predicción comprobable: sin fuente de bloques pendientes habrá espera o fallo; con replica accesible podría completar. Estas predicciones se reemplazan por resultados observados únicamente al ejecutar. [Hypercore: replicación y datos autenticados](https://github.com/holepunchto/hypercore).

## 5. Arquitectura y liability

La comparación es una hipótesis de diseño para el lab. En un host centralizado existe un operador reconocible que puede recibir takedowns, suspender cuentas, reunir registros y responder solicitudes; el uploader también responde por su conducta. En P2P la disponibilidad y la retirada se reparten entre usuarios que conservan copias. Pedir a un seeder que deje de ofrecer contenido no borra las replicas de otros. El desarrollador todavía decide UX, distribución, publicidad y algunas dependencias.

Napster centralizaba el índice aunque el archivo pasara entre usuarios. Ese índice concentraba intervención y exposición de la compañía. BitTorrent distribuye piezas entre peers: BEP 3 usa tracker para discovery y BEP 5 añade DHT. El tracker coordina y no necesita alojar el archivo; apagar uno puede no eliminar otras rutas de descubrimiento. Ninguna de esas topologías decide por sí misma si el uso concreto es lícito. [Napster: resumen del Copyright Office](https://www.copyright.gov/fair-use/summaries/a%26mrecords-napster-9thcir2001.pdf), [BEP 3](https://www.bittorrent.org/beps/bep_0003.html), [BEP 5](https://www.bittorrent.org/beps/bep_0005.html).

En **MGM v. Grokster (2005)**, promover el uso infractor mediante expresiones o acciones afirmativas puede generar responsabilidad por infracciones de terceros. Descentralizar el transporte no borra esa exposición del distribuidor. Para PactTrail, la interfaz debe explicar usos autorizados de comprobantes, sin promover evasión o distribución infractora. La topología cambia puntos de control, no concede inmunidad al cliente ni al maintainer. [Ficha de Oyez](https://www.oyez.org/cases/2004/04-480); [opinión judicial reproducida en Justia](https://supreme.justia.com/cases/federal/us/545/913/).

## 6. PactTrail y Decreto 15-2026

PactTrail puede usar P2P para entregar un comprobante propio de tarea al contratante. El contrato inteligente y el procedimiento de aceptación siguen siendo otra capa: un hash acredita integridad del archivo, no que el trabajo se hizo ni que se deba pagar. Aquí no se implementaron wallets, oráculos ni pagos. Los documentos reales de trabajo pueden contener PII; por eso el lab solo transmite material sintético.

**Si PactTrail encuadra como Persona Obligada o PSAV bajo Decreto 15-2026, quitar el servidor no elimina los deberes aplicables de debida diligencia/KYC, registro y reportes ante IVE/SIB.** El encuadre depende de sus servicios reales, incluida posible custodia, transferencia u operación para terceros, y requiere revisar norma y reglamentación. No se atribuye automáticamente el deber empresarial al usuario que seedea un documento.

El Congreso identifica el Decreto 15-2026 y su entrada en vigor el **17 de septiembre de 2026**. El paquete del curso señala un reglamento pendiente y cita art. 127; no se confirmó aquí el articulado completo ni el estado del reglamento a la fecha de ejecución, por lo que no se afirma un número de artículo o una ausencia vigente. La Iniciativa 6538 no se usa como norma promulgada. [Ficha oficial del decreto](https://www.congreso.gob.gt/detalle_pdf/decretos/13705), [información oficial sobre PSAV y reglamentación, junio de 2026](https://www.congreso.gob.gt/noticias_congreso/16365/2026/4).

Aprendizaje: discovery no equivale a storage; una key no demuestra una persona; una conexión no demuestra entrega; terminar desde caché no demuestra otro seeder. El límite empírico de este trabajo se conserva junto con la evidencia, porque un fallo real vale más que una conexión inventada.
