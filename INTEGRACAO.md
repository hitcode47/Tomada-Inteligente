# Tomada Inteligente - Guia de Integração

## Arquitetura

```
ESP32 (Hardware)
    ↓ (POST JSON)
Backend Flask (Python)
    ↓ (HTTP GET)
Frontend React (JavaScript)
    ↓ (Controle de UI)
Navegador
```

## Instruções para Executar

### 1. Backend Flask

```bash
# Navegar até a pasta Backend
cd Backend

# Instalar dependências
pip install -r requirements.txt

# Executar o servidor
python app.py
```

O backend estará disponível em: `http://localhost:5000`

**Endpoints disponíveis:**
- `POST /api/energia/<serial_number>` - Receber dados do ESP32
- `GET /api/energia/<serial_number>` - Último registro
- `GET /api/energia/<serial_number>/history` - Histórico de registros

### 2. Frontend React

```bash
# Navegar até a pasta Frontend
cd Frontend

# Instalar dependências (se não estiver feito)
npm install

# Modo desenvolvimento
npm run dev

# Ou build para produção
npm run build
```

O frontend estará disponível em: `http://localhost:5173` (ou a porta indicada pelo Vite)

**Variáveis de ambiente:**
- `VITE_API_BASE_URL` - URL da API (padrão: `http://localhost:5000`)

Editar `.env` para mudar o servidor:
```
VITE_API_BASE_URL=http://seu-ip:5000
```

### 3. Testar com Dados Simulados

```bash
# Na pasta Backend, em outro terminal
python test_backend.py
```

Este script:
- ✓ Popula o histórico com 10 registros por socket
- ✓ Envia dados simulados a cada 5 segundos
- ✓ Exibe o histórico no console

### 4. Configurar Hardware ESP32

Editar o arquivo `.ino` e atualizar:
```cpp
serverUrl = "http://<seu-ip>:5000/api/energia/" + SERIAL_NUMBER;
```

Onde `<seu-ip>` é o IP da máquina rodando o Backend.

## Fluxo de Dados

### Hardware → Backend
O ESP32 envia dados via `POST`:
```json
{
  "voltage": 230.5,
  "current": 1.25,
  "power": 288.1,
  "frequency": 60.0,
  "pf": 0.95
}
```

### Backend → Frontend
O Frontend faz polling a cada 5 segundos (configurável em `src/config.js`):
```json
{
  "serial_number": "test-socket-01",
  "received_at": "2026-05-16T10:30:45.123Z",
  "voltage": 230.5,
  "current": 1.25,
  "power": 288.1,
  "frequency": 60.0,
  "pf": 0.95
}
```

## Troubleshooting

**Frontend não conecta ao Backend:**
- Verificar se o Backend está rodando em `http://localhost:5000`
- Atualizar `.env` com o IP correto
- Limpar cache do navegador (Ctrl+Shift+Del)

**Erro CORS:**
- O Backend já tem CORS configurado para aceitar requisições de qualquer origem
- Se ainda houver erro, editar `app.py` e adicionar `@app.after_request`

**ESP32 não envia dados:**
- Verificar se a conexão WiFi está estável
- Verificar se o IP do backend está correto
- Testar com `curl` do computador

**Dados antigos no histórico:**
- O histórico fica na memória do Backend enquanto estiver rodando
- Reiniciar o Backend para limpar histórico
- Para persistência, adicionar banco de dados (SQLite/PostgreSQL)

## Próximos Passos

- [ ] Implementar autenticação (JWT/OAuth)
- [ ] Adicionar banco de dados para persistência
- [ ] Webocket para atualização em tempo real
- [ ] Dashboard com gráficos avançados
- [ ] Alertas e notificações
- [ ] Controle de tomadas (ON/OFF)
