# Biblioteca Virtual Eclesiástica

Proyecto de 8 semanas: plataforma para digitalizar y consultar ~3000 libros
eclesiásticos con Azure (Blob Storage + Cosmos DB for NoSQL).
Toda la documentación está en `documents/`.

## Azure CLI

`az` está instalado y con sesión iniciada (suscripción Azure for Students).
Los recursos y su configuración están en `documents/stack-tecnologico.md`.

- Usar solo comandos de lectura (`list`, `show`) salvo que se pida lo contrario.
- No ejecutar comandos que impriman llaves o cadenas de conexión.
- Antes de crear o borrar recursos, confirmar con el usuario: el crédito es limitado.
- Si `az` pide iniciar sesión, pedir al usuario que corra `! az login`.

## Mantenimiento de la documentación

Al terminar una tarea o tomar una decisión, actualiza el archivo que corresponda
sin que te lo pidan, y avisa qué cambiaste:

- Tecnología o servicio elegido o descartado → `documents/stack-tecnologico.md`
- Cambios al modelo de datos → `documents/modelo-datos.md`
- Avance, tareas hechas, bloqueos o decisiones abiertas → `documents/progreso.md`
  (actualizar también la fecha de "Última actualización" y el registro)
- Si una decisión abierta de `progreso.md` se resuelve, tacharla ahí y reflejarla
  en el archivo correspondiente.

No marques algo como hecho sin confirmarlo. Si no sabes el estado real, pregunta.
