# 🔧 Backend Integration Requirements for Tournament Matches

## 📋 Overview
Para que la funcionalidad de gestión de partidas de torneo funcione completamente, el backend necesita implementar los siguientes endpoints y funcionalidades.

## 🏆 **Flujo de Funcionalidad Deseado**

1. **Usuario crea torneo** → Se convierte en **organizador**
2. **Partidas se juegan físicamente u online**
3. **Organizador ve la vista de partidas** → Sistema detecta que es el creador
4. **Solo organizador puede añadir/modificar resultados**
5. **Resultados se actualizan en tiempo real**

---

## 🚀 **Endpoints Necesarios en el Backend**

### **1. Verificación de Permisos de Organizador**
```http
GET /api/matches/tournament/{tournamentId}/is-organizer
```

**Descripción**: Verifica si el usuario actual (por JWT token) es el organizador del torneo.

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Response**:
```json
{
  "success": true,
  "data": true,  // true si es organizador, false si no
  "message": "User is tournament organizer"
}
```

### **2. Obtener Partidas por Torneo**
```http
GET /api/matches/tournament/{tournamentId}
```

**Response** (necesita incluir información de jugadores):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "tournamentId": 1,
      "whitePlayerId": 2,
      "blackPlayerId": 3,
      "result": "white_wins", // Enum: white_wins, black_wins, draw, ongoing, not_started
      "round": 1,
      "whitePlayer": {
        "id": 2,
        "name": "Juan Pérez",
        "rating": 1650
      },
      "blackPlayer": {
        "id": 3,
        "name": "María García", 
        "rating": 1580
      }
    }
  ]
}
```

### **3. Actualizar Resultado de Partida**
```http
PUT /api/matches/{matchId}/result
```

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Body**:
```json
{
  "result": "white_wins"  // Enum: white_wins, black_wins, draw, not_started
}
```

**Validación**: Solo permitir si el usuario es organizador del torneo de esa partida.

---

## 🗄️ **Modificaciones en Base de Datos**

### **Tabla Tournaments**
Asegurarse de que existe el campo `created_by` o `organizer_id`:

```sql
ALTER TABLE tournaments ADD COLUMN created_by INT REFERENCES users(id);
```

### **Tabla Matches**
Verificar que tenga estos campos:
```sql
CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  tournament_id INT REFERENCES tournaments(id),
  white_player_id INT REFERENCES users(id),
  black_player_id INT REFERENCES users(id),
  result ENUM('white_wins', 'black_wins', 'draw', 'ongoing', 'not_started') DEFAULT 'not_started',
  round INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔒 **Lógica de Permisos**

### **Verificación de Organizador**
```typescript
// Pseudo-código para el backend
async function isUserTournamentOrganizer(userId: number, tournamentId: number): Promise<boolean> {
  const tournament = await Tournament.findById(tournamentId);
  return tournament.created_by === userId;
}

async function updateMatchResult(matchId: number, result: MatchResult, userId: number) {
  const match = await Match.findById(matchId);
  const isOrganizer = await isUserTournamentOrganizer(userId, match.tournament_id);
  
  if (!isOrganizer) {
    throw new Error('Only tournament organizer can update match results');
  }
  
  // Actualizar resultado
  await Match.update(matchId, { result, updated_at: new Date() });
}
```

---

## 📱 **Estado Actual del Frontend**

### **✅ Ya Implementado**:
- ✅ Interfaz para seleccionar resultados (dropdowns con 1-0, 0-1, ½-½)
- ✅ Detección visual de organizador (badge "Organizador") 
- ✅ Mapeo entre formatos frontend/backend
- ✅ Estados de carga y error
- ✅ Estructura de datos `SimpleMatch`
- ✅ Métodos preparados para API calls

### **🔄 Usando Mock Data**:
- 🔄 `isOrganizer()` - actualmente devuelve `true` si usuario logueado
- 🔄 `updateMatchResult()` - simula API call con `setTimeout()`
- 🔄 `loadMatches()` - genera datos de ejemplo

### **⏳ Pendiente de Backend**:
- ⏳ API call real para verificar organizador
- ⏳ API call real para cargar partidas con información de jugadores
- ⏳ API call real para actualizar resultados
- ⏳ Validación de permisos en servidor

---

## 🔄 **Mapeo de Enums**

### **Frontend → Backend**:
```typescript
'1-0'  → MatchResult.WHITE_WINS
'0-1'  → MatchResult.BLACK_WINS  
'½-½'  → MatchResult.DRAW
null   → MatchResult.NOT_STARTED
```

### **Backend → Frontend**:
```typescript
MatchResult.WHITE_WINS → '1-0'
MatchResult.BLACK_WINS → '0-1' 
MatchResult.DRAW       → '½-½'
MatchResult.ONGOING    → null (status: 'in-progress')
MatchResult.NOT_STARTED → null (status: 'pending')
```

---

## 🎯 **Próximos Pasos**

1. **Implementar endpoints en backend** según las especificaciones
2. **Agregar campo `created_by` a tabla tournaments** si no existe
3. **Descomentar API calls en frontend** y probar integración
4. **Añadir validación de permisos** en todos los endpoints de matches
5. **Testear flujo completo** desde creación hasta actualización de resultados

---

## 💡 **Consideraciones Adicionales**

### **Seguridad**:
- Todas las operaciones deben verificar JWT token válido
- Verificar permisos de organizador antes de cada operación
- Log de cambios de resultados para auditoria

### **UX**:
- Mostrar mensajes de error claros si no es organizador
- Deshabilitar controles si no tiene permisos
- Indicadores de carga durante actualizaciones

### **Performance**:
- Caché de verificación de organizador por sesión
- Paginación si hay muchas partidas
- Actualización optimista en frontend con rollback en caso de error