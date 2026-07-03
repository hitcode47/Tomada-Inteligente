# Tomada Inteligente - EcoPlugWeb

Sistema completo de monitoramento e controle de tomadas inteligentes com medição de energia em tempo real.

## 🏗️ Arquitetura

```
┌──────────────────────────────────────────────────┐
│                   Hardware (ESP32)               │
│        + PZEM-004T (Medidor de Energia)         │
│        + WiFi Enterprise (UFMG/Eduroam)        │
└──────────────────┬───────────────────────────────┘
                   │ POST JSON (5s)
                   ↓
┌──────────────────────────────────────────────────┐
│         Backend (Flask - Python)                 │
│      /api/energia/<serial_number>               │
│      - Recebe dados do hardware                 │
│      - Armazena histórico em memória            │
└──────────────────┬───────────────────────────────┘
                   │ GET JSON (polling)
                   ↓
┌──────────────────────────────────────────────────┐
│         Frontend (React - JavaScript)            │
│      - Dashboard em tempo real                  │
│      - Gráficos de consumo                      │
│      - Gerenciamento de tomadas                 │
└──────────────────┬───────────────────────────────┘
                   │
                   ↓
            📊 Navegador
```

## 📁 Estrutura do Projeto

```
Tomada-Inteligente/
├── Backend/
│   ├── app.py                 # Servidor Flask
│   ├── test_backend.py        # Script para testar com dados simulados
│   └── requirements.txt       # Dependências Python
├── Frontend/
│   ├── src/
│   │   ├── components/        # Componentes React
│   │   │   ├── Header.jsx
│   │   │   ├── ManagementSection.jsx
│   │   │   ├── ControlSection.jsx
│   │   │   ├── MonitoringSection.jsx
│   │   │   ├── ChartFilterSection.jsx
│   │   │   └── HistorySection.jsx
│   │   ├── pages/
│   │   │   └── HomePage.jsx
│   │   ├── hooks/
│   │   │   └── useSockets.js
│   │   ├── services/
│   │   │   └── socketService.js
│   │   ├── config.js
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── .env                   # Variáveis de ambiente
│   ├── package.json
│   └── vite.config.js
├── hardware/
│   └── PZEM-004T-NodeMCU_Testing/
│       └── PZEM-004T-NodeMCU_Testing.ino
├── Banco de Dados/
├── start.bat                  # Script para iniciar (Windows)
├── start.sh                   # Script para iniciar (Unix/Mac)
├── INTEGRACAO.md             # Guia detalhado de integração
└── README.md                 # Este arquivo
```

## 🚀 Quick Start

### Pré-requisitos
- Python 3.8+
- Node.js 16+
- npm ou yarn

### Iniciação Rápida (Windows)

```bash
# Duplo clique em start.bat
start.bat
```

Ou manualmente:

```bash
# Terminal 1 - Backend
cd Backend
pip install -r requirements.txt
python app.py

# Terminal 2 - Frontend
cd Frontend
npm install
npm run dev
```

### Iniciação Rápida (Linux/Mac)

```bash
chmod +x start.sh
./start.sh
```

## 🌐 Acessar a Aplicação

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000

## 📊 Endpoints da API

### Receber dados do ESP32
```
POST /api/energia/<serial_number>
Content-Type: application/json

{
  "voltage": 230.5,
  "current": 1.25,
  "power": 288.1,
  "frequency": 60.0,
  "pf": 0.95
}
```

### Obter último registro
```
GET /api/energia/<serial_number>
```

### Obter histórico completo
```
GET /api/energia/<serial_number>/history
```

## 🧪 Testar com Dados Simulados

```bash
cd Backend
python test_backend.py
```

Isso irá:
1. Criar histórico de 10 registros para cada tomada
2. Enviar dados simulados a cada 5 segundos
3. Exibir o histórico no console

## ⚙️ Configuração do Hardware

### ESP32 - Configurar IP do Backend

Editar `PZEM-004T-NodeMCU_Testing.ino`:

```cpp
// Mudar para o IP da sua máquina executando o Backend
serverUrl = "http://192.168.0.105:5000/api/energia/" + SERIAL_NUMBER;
```

### WiFi Enterprise (UFMG/Eduroam)

O hardware se conecta automaticamente via portal de configuração:
1. Conectar ao AP `Tomada-Setup` (senha: `12345678`)
2. Acessar `192.168.4.1`
3. Inserir credenciais de WiFi Enterprise
4. Dispositivo se conecta e começa a enviar dados

## 🔧 Configuração do Frontend

Editar `Frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000
```

Para produção com IP diferente:
```env
VITE_API_BASE_URL=http://seu-servidor.com.br:5000
```

## 📱 Funcionalidades

### Dashboard
- ✓ Status de conexão em tempo real
- ✓ Métricas: Tensão, Corrente, Potência
- ✓ Histórico de últimas ativações

### Gerenciamento
- ✓ Adicionar/remover tomadas
- ✓ Renomear tomadas
- ✓ Controle on/off

### Monitoramento
- ✓ Gráfico de consumo
- ✓ Seleção de tomadas para análise
- ✓ Histórico completo

## 🔄 Fluxo de Dados em Tempo Real

1. **ESP32** envia dados a cada 5 segundos
2. **Backend** recebe e armazena na memória
3. **Frontend** faz polling a cada 5 segundos
4. **UI** atualiza com últimos dados

Tempo total: ~50ms de latência

## 🐛 Troubleshooting

**Frontend não conecta ao Backend:**
- Verificar se Backend está rodando em `http://localhost:5000`
- Atualizar `.env` com IP correto
- Limpar cache do navegador

**CORS Error:**
- Backend já tem CORS configurado
- Se persistir, editar `app.py` para adicionar headers específicos

**Dados não atualizam:**
- Verificar console do navegador (F12)
- Verificar se `test_backend.py` está enviando dados

**ESP32 não conecta:**
- Verificar SSID e senha do WiFi
- Verificar IP do Backend
- Serial monitor do Arduino IDE para debug

## 📚 Próximos Passos

- [ ] Implementar banco de dados (SQLite/PostgreSQL)
- [ ] Autenticação com JWT
- [ ] WebSockets para atualização em tempo real
- [ ] Gráficos com Chart.js
- [ ] Controle real das tomadas (relay)
- [ ] Alertas e notificações
- [ ] Histórico persistente
- [ ] Exportar dados em CSV

## 📄 Licença

MIT

## 👤 Autor

Bruno - 2026

---

Para mais detalhes, ver `INTEGRACAO.md`

