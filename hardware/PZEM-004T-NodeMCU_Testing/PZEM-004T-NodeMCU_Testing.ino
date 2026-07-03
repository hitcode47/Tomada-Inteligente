#include <WiFi.h>
#include <HTTPClient.h>
#include <WebServer.h>
#include <Preferences.h>
#include <PZEM004Tv30.h>
#include <ArduinoOTA.h>
#include "esp_eap_client.h"
#include "esp_wifi.h"

// ======================
// Configuração
// ======================
#define SERVER_BASE_URL    "http://136.248.114.143:5000"
#define AP_SSID            "Tomada-Setup"
#define AP_PASS            "12345678"
#define PZEM_RX            16
#define PZEM_TX            17
#define RELAY_PIN          15
#define RESET_BTN_PIN      5    // ativo em LOW
#define LED_PIN            22   // vermelho: sistema ligado / pisca no reset
#define LED_GREEN_PIN      23   // verde: WiFi conectado
#define CONNECT_TIMEOUT_S  309
#define HTTP_TIMEOUT_MS    8000
#define SEND_INTERVAL_MS   5000

// ======================
// Objetos
// ======================
WebServer      server(80);
Preferences    prefs;
HardwareSerial pzemSerial(1);
PZEM004Tv30*   pzem = nullptr;   // inicializado em setup(), evita construtor antes de Serial.begin()

// ======================
// Estado
// ======================
String wifiSSID, loginUFMG, senhaUFMG, serverBase;
String SERIAL_NUMBER, serverUrl;
float  VOLTAGE, CURRENT, POWER, ENERGY, FREQ, PF;
bool   relayOn = false;

// ======================
// Utilitários
// ======================
float zeroIfNan(float v) {
  return (isnan(v) || isinf(v) || v > 1e6f) ? 0.0f : v;
}

// Garante serial sempre com 16 chars hex (zero-padded)
String fmtHex32(uint32_t v) {
  char buf[9];
  snprintf(buf, sizeof(buf), "%08lx", (unsigned long)v);
  return String(buf);
}

// ======================
// Portal de configuração
// ======================
void handleRoot() {
  String html = R"rawliteral(
<!DOCTYPE html><html>
<body style='font-family:Arial;padding:20px'>
  <h2>Configuração WiFi Enterprise</h2>
  <div style='background:#f0f0f0;padding:12px;border-radius:8px;margin-bottom:20px'>
    <p style='margin:0 0 4px;font-size:13px;color:#555'>Serial do dispositivo</p>
    <p style='margin:0;font-size:22px;font-weight:bold;letter-spacing:3px;font-family:monospace'>)rawliteral"
  + SERIAL_NUMBER +
  R"rawliteral(</p>
    <p style='margin:6px 0 0;font-size:12px;color:#888'>Anote este código para vincular o dispositivo ao seu app.</p>
  </div>
  <form action="/save" method="POST">
    SSID:<br><input name="ssid" style='width:100%;padding:6px;margin:4px 0 12px'><br>
    Usuário UFMG:<br><input name="login" style='width:100%;padding:6px;margin:4px 0 12px'><br>
    Senha:<br><input name="senha" type="password" style='width:100%;padding:6px;margin:4px 0 12px'><br>
    URL do servidor:<br><input name="server" value=")rawliteral"
  + serverBase +
  R"rawliteral(" placeholder="http://IP:5000" style='width:100%;padding:6px;margin:4px 0 12px'><br>
    <input type="submit" value="Conectar" style='background:#2a7;color:#fff;padding:10px 24px;border:none;border-radius:4px;cursor:pointer'>
  </form>
  <hr style='margin:24px 0'>
  <form action="/reset" method="POST">
    <input type="submit" value="Apagar credenciais salvas"
      style='background:#c33;color:#fff;padding:8px 16px;border:none;border-radius:4px;cursor:pointer'>
  </form>
</body></html>
)rawliteral";
  server.send(200, "text/html", html);
}

void handleSave() {
  prefs.begin("wifi", false);
  prefs.putString("ssid",  server.arg("ssid"));
  prefs.putString("login", server.arg("login"));
  prefs.putString("senha", server.arg("senha"));
  String sv = server.arg("server");
  if (sv.length() > 0) prefs.putString("server", sv);
  prefs.end();
  server.send(200, "text/html", "<h2>Credenciais salvas! Reiniciando...</h2>");
  delay(2000);
  ESP.restart();
}

void handleReset() {
  prefs.begin("wifi", false);
  prefs.clear();
  prefs.end();
  server.send(200, "text/html", "<h2>Credenciais apagadas. Reiniciando...</h2>");
  delay(2000);
  ESP.restart();
}

void startConfigPortal() {
  Serial.println("\n[Portal] Iniciando portal de configuração...");
  Serial.printf("[Portal] Serial: %s\n", SERIAL_NUMBER.c_str());

  WiFi.softAP(AP_SSID, AP_PASS);
  Serial.printf("[Portal] Conecte ao WiFi '%s' e acesse http://%s\n",
    AP_SSID, WiFi.softAPIP().toString().c_str());

  server.on("/",      HTTP_GET,  handleRoot);
  server.on("/save",  HTTP_POST, handleSave);
  server.on("/reset", HTTP_POST, handleReset);
  server.begin();

  while (true) {
    server.handleClient();
    delay(10);
  }
}

// ======================
// Servidor de config (operação normal)
// ======================
void startNormalWebServer() {
  server.on("/", HTTP_GET, []() {
    String html = "<html><body style='font-family:Arial;padding:20px'>"
      "<h2>EcoPlug — " + SERIAL_NUMBER + "</h2>"
      "<p>Servidor atual: <b>" + serverBase + "</b></p>"
      "<form action='/server' method='POST'>"
      "Nova URL:<br>"
      "<input name='server' value='" + serverBase + "' style='width:300px;padding:6px;margin:6px 0'><br>"
      "<input type='submit' value='Atualizar' style='background:#2a7;color:#fff;padding:8px 20px;border:none;border-radius:4px;cursor:pointer'>"
      "</form></body></html>";
    server.send(200, "text/html", html);
  });

  server.on("/server", HTTP_POST, []() {
    String sv = server.arg("server");
    if (sv.length() > 0) {
      prefs.begin("wifi", false);
      prefs.putString("server", sv);
      prefs.end();
      serverBase = sv;
      serverUrl  = serverBase + "/api/energia/" + SERIAL_NUMBER;
      Serial.printf("[Config] URL atualizada: %s\n", serverBase.c_str());
      server.send(200, "text/html",
        "<html><body style='font-family:Arial;padding:20px'>"
        "<h2>URL atualizada!</h2><p>" + serverBase + "</p>"
        "<a href='/'>Voltar</a></body></html>");
    } else {
      server.send(400, "text/plain", "URL invalida");
    }
  });

  server.begin();
  Serial.printf("[Config] Acesse http://%s/ para alterar a URL do servidor\n",
    WiFi.localIP().toString().c_str());
}

// ======================
// Conexão Enterprise
// ======================
bool connectEnterpriseWiFi() {
  Serial.printf("[WiFi] Conectando a '%s'...\n", wifiSSID.c_str());

  WiFi.disconnect(true, true);
  delay(500);
  WiFi.mode(WIFI_STA);

  esp_eap_client_set_identity(
    (const unsigned char*)loginUFMG.c_str(), loginUFMG.length());
  esp_eap_client_set_username(
    (const unsigned char*)loginUFMG.c_str(), loginUFMG.length());
  esp_eap_client_set_password(
    (const unsigned char*)senhaUFMG.c_str(), senhaUFMG.length());

  esp_wifi_sta_enterprise_enable();
  WiFi.begin(wifiSSID.c_str());

  for (int i = 0; i < CONNECT_TIMEOUT_S; i++) {
    if (WiFi.status() == WL_CONNECTED) break;
    Serial.print(".");
    delay(1000);
  }
  Serial.println();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Falha na conexão.");
    return false;
  }

  Serial.println("[WiFi] Conectado!");
  Serial.printf("[WiFi] IP local  : %s\n", WiFi.localIP().toString().c_str());
  Serial.println("[WiFi] ====================================");
  Serial.printf("[WiFi] Serial do dispositivo: %s\n", SERIAL_NUMBER.c_str());
  Serial.println("[WiFi] Use o serial acima para vincular no app.");
  Serial.println("[WiFi] ====================================");
  return true;
}

// ======================
// OTA (upload via WiFi)
// ======================
void setupOTA() {
  ArduinoOTA.setHostname(("tomada-" + SERIAL_NUMBER.substring(8)).c_str());
  ArduinoOTA.setPassword("ecoplug");   // senha exigida no upload OTA

  ArduinoOTA.onStart([]() {
    Serial.println("[OTA] Iniciando upload...");
  });
  ArduinoOTA.onEnd([]() {
    Serial.println("\n[OTA] Concluído. Reiniciando.");
  });
  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
    Serial.printf("[OTA] %u%%\r", progress * 100 / total);
  });
  ArduinoOTA.onError([](ota_error_t error) {
    Serial.printf("[OTA] Erro %u\n", error);
  });

  ArduinoOTA.begin();
  Serial.printf("[OTA] Pronto. Hostname: %s\n", ArduinoOTA.getHostname().c_str());
}

// ======================
// Reset por botão (segurar 5s)
// ======================
void checkResetButton() {
  static unsigned long pressStart = 0;
  static bool          wasPressed = false;

  bool pressed = (digitalRead(RESET_BTN_PIN) == LOW);

  if (pressed && !wasPressed) {
    pressStart = millis();
    wasPressed = true;
  } else if (!pressed) {
    wasPressed = false;
    pressStart = 0;
  } else if (pressed && (millis() - pressStart >= 5000)) {
    Serial.println("[Reset] Botão segurado 5s — apagando credenciais...");

    for (int i = 0; i < 3; i++) {
      digitalWrite(LED_PIN, HIGH); delay(200);
      digitalWrite(LED_PIN, LOW);  delay(200);
    }

    prefs.begin("wifi", false);
    prefs.clear();
    prefs.end();

    Serial.println("[Reset] Pronto. Reiniciando no portal de configuração...");
    delay(500);
    ESP.restart();
  }
}

// ======================
// Leitura PZEM
// ======================
void readPZEM() {
  VOLTAGE = zeroIfNan(pzem->voltage());
  CURRENT = zeroIfNan(pzem->current());
  POWER   = zeroIfNan(pzem->power());
  ENERGY  = zeroIfNan(pzem->energy());   // Wh acumulado
  FREQ    = zeroIfNan(pzem->frequency());
  PF      = zeroIfNan(pzem->pf());

  if (VOLTAGE < 10.0f) {
    CURRENT = 0.0f;
    POWER   = 0.0f;
  }
}

void printPzem() {
  Serial.println("\n===== PZEM =====");
  Serial.printf("Voltage   : %.2f V\n",  VOLTAGE);
  Serial.printf("Current   : %.3f A\n",  CURRENT);
  Serial.printf("Power     : %.2f W\n",  POWER);
  Serial.printf("Energy    : %.0f Wh\n", ENERGY);
  Serial.printf("Frequency : %.1f Hz\n", FREQ);
  Serial.printf("PF        : %.2f\n",    PF);
  Serial.printf("Relay     : %s\n",      relayOn ? "ON" : "OFF");
  Serial.println("================");
}

// ======================
// Envio ao backend
// ======================
void sendData() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(serverUrl.c_str());
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(HTTP_TIMEOUT_MS);

  char json[192];
  snprintf(json, sizeof(json),
    "{\"voltage\":%.2f,\"current\":%.3f,\"power\":%.2f,"
    "\"energy\":%.1f,\"frequency\":%.1f,\"pf\":%.2f}",
    VOLTAGE, CURRENT, POWER, ENERGY, FREQ, PF);

  int code = http.POST(json);

  if (code == HTTP_CODE_OK || code == HTTP_CODE_CREATED) {
    String payload = http.getString();
    bool newRelay = payload.indexOf("\"relay\":true") >= 0;
    if (newRelay != relayOn) {
      relayOn = newRelay;
      digitalWrite(RELAY_PIN, relayOn ? HIGH : LOW);
      prefs.begin("relay", false);
      prefs.putBool("state", relayOn);
      prefs.end();
    }
    Serial.printf("[HTTP] Enviado OK | Relay: %s\n", relayOn ? "ON" : "OFF");
  } else if (code < 0) {
    Serial.printf("[HTTP] Erro: %s\n", http.errorToString(code).c_str());
  } else {
    Serial.printf("[HTTP] Servidor retornou %d\n", code);
  }

  http.end();
}

// ======================
// Setup
// ======================
void setup() {
  Serial.begin(115200);
  delay(3000);

  // Serial number: MAC gravado em hardware, sempre 16 chars hex
  uint64_t mac = ESP.getEfuseMac();
  SERIAL_NUMBER = fmtHex32((uint32_t)(mac >> 32)) + fmtHex32((uint32_t)mac);

  Serial.println("\n==============================");
  Serial.printf("  Serial: %s\n", SERIAL_NUMBER.c_str());
  Serial.println("==============================\n");

  // Relay + LED + botão de reset
  pinMode(RELAY_PIN,     OUTPUT);
  pinMode(LED_PIN,       OUTPUT);
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(RESET_BTN_PIN, INPUT_PULLUP);
  digitalWrite(RELAY_PIN,    LOW);
  digitalWrite(LED_PIN,      HIGH); // vermelho sempre ligado (sistema ON)
  digitalWrite(LED_GREEN_PIN, LOW);

  // PZEM — inicializado aqui para que o construtor rode após Serial.begin()
  // O construtor chama pzemSerial.begin(9600) internamente
  pzem = new PZEM004Tv30(&pzemSerial, PZEM_RX, PZEM_TX);

  // Credenciais WiFi + URL do servidor
  prefs.begin("wifi", true);
  wifiSSID   = prefs.getString("ssid",   "");
  loginUFMG  = prefs.getString("login",  "");
  senhaUFMG  = prefs.getString("senha",  "");
  serverBase = prefs.getString("server", SERVER_BASE_URL);
  prefs.end();

  serverUrl = serverBase + "/api/energia/" + SERIAL_NUMBER;
  Serial.printf("[Config] Servidor: %s\n", serverBase.c_str());

  if (wifiSSID.isEmpty() || loginUFMG.isEmpty() || senhaUFMG.isEmpty()) {
    startConfigPortal();  // não retorna
  }

  if (!connectEnterpriseWiFi()) {
    Serial.println("[Setup] Reiniciando em 10s para nova tentativa...");
    delay(10000);
    ESP.restart();
  }
  digitalWrite(LED_GREEN_PIN, HIGH); // verde ON: WiFi conectado

  // Restaura estado do relé salvo antes de iniciar o loop
  prefs.begin("relay", true);
  relayOn = prefs.getBool("state", false);
  prefs.end();
  digitalWrite(RELAY_PIN, relayOn ? HIGH : LOW);
  Serial.printf("[Relay] Estado restaurado: %s\n", relayOn ? "ON" : "OFF");

  setupOTA();
  startNormalWebServer();
}

// ======================
// Loop
// ======================
void loop() {
  static unsigned long lastSend = 0;

  ArduinoOTA.handle();
  server.handleClient();
  checkResetButton();

  // Reconexão: reinicia o ESP em vez de ir ao portal (credenciais já salvas)
  if (WiFi.status() != WL_CONNECTED) {
    digitalWrite(LED_GREEN_PIN, LOW); // verde OFF: sem WiFi
    Serial.println("[WiFi] Conexão perdida. Reconectando...");
    if (!connectEnterpriseWiFi()) {
      Serial.println("[WiFi] Falha. Reiniciando em 10s...");
      delay(10000);
      ESP.restart();
    }
    digitalWrite(LED_GREEN_PIN, HIGH); // verde ON: reconectado
  }

  unsigned long now = millis();
  if (now - lastSend >= SEND_INTERVAL_MS) {
    lastSend = now;
    readPZEM();
    printPzem();
    sendData();
  }

  delay(10);  // cede CPU sem bloquear
}
