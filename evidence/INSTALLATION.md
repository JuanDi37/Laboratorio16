# Fallo de preparación observado

Se ejecutó `npm.cmd install --no-audit --no-fund` desde el proyecto. Terminó con exit code **1**. Extracto del output real:

```text
npm error code EACCES
npm error errno EACCES
npm error FetchError: request to https://registry.npmjs.org/hypercore failed, reason:
npm error The operation was rejected by your operating system.
npm error Log files were not written due to an error writing to the directory: C:\Users\juanl\AppData\Local\npm-cache\_logs
```

El entorno de trabajo tiene red restringida y solo permite escritura en el workspace. La falla impidió instalar dependencias. No se observó discovery Hyperswarm, no hubo un peer compañero conectado y no se realizó un kill-seeder. No se usa este error para concluir que la red del aula bloquea UDP.

La guía ahora coloca la caché en el proyecto (`--cache .npm-cache`) para corregir la ubicación de escritura; eso no concede acceso al registro ni modifica permisos de red. Ejecuta la instalación desde un entorno con acceso permitido y registra el resultado real. No se requiere cambiar políticas de ejecución de PowerShell porque se usa npm.cmd.
