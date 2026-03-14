# Skill: Frontend — Interfaz de Chat

## Cuándo usar esta skill
Cuando se trabaja en la UI de la aplicación: componentes React,
estilos, layout del chat, landing page.

## Stack de frontend
- Next.js 14 con App Router (app/ directory)
- React (componentes funcionales + hooks)
- CSS personalizado (tema oscuro)
- Sin Tailwind por ahora (posible migración futura)

## Diseño actual
- Hero animado con título "trade.ai" y subtítulo
- Chips de ejemplo de consultas clickeables
- Área de mensajes con historial de conversación
- Input fijo en la parte inferior de la pantalla
- Indicador de "escribiendo..." cuando la IA procesa
- Disclaimer automático al final de cada respuesta de la IA
- Tema oscuro profesional

## Archivo principal: app/page.js
Contiene toda la lógica del chat en un solo componente.
Futuro: separar en componentes más pequeños.

## Reglas de UI
1. Todo el texto de la interfaz en español argentino
2. Responsive: funcionar bien en móvil y desktop
3. El input nunca debe quedar oculto bajo el teclado en móvil
4. Los mensajes de error deben ser claros y amigables
5. Nunca mostrar errores técnicos al usuario final
6. Los mensajes del usuario se alinean a la derecha
7. Los mensajes de la IA se alinean a la izquierda
8. El disclaimer aparece como texto más pequeño y gris

## API endpoint
POST /api/consulta
Body: { "consulta": "texto del usuario" }
Response: { "respuesta": "texto de la IA", "fuentes": [...] }
