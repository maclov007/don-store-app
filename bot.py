import os
import time
import requests
import json
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/')
def home():
    return "Bot F12 Network Inspector (Modo Completo) está Online!"

@app.route('/analisar', methods=['POST'])
def analisar_checkout():
    dados = request.get_json()
    url = dados.get('url') if dados else None

    if not url:
        return jsonify({"erro": "Nenhuma URL fornecida."}), 400

    # Simulação realista de headers de um navegador real para puxar o tráfego limpo
    headers = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Connection": "keep-alive"
    }

    try:
        inicio = time.time()
        # Executando a requisição e capturando o caminho reverso completo
        resposta = requests.get(url, headers=headers, allow_redirects=True, timeout=20)
        fim = time.time()
        
        tempo_resposta = round((fim - inicio) * 1000, 2)

        # Montando o relatório técnico absoluto (Tudo o que o F12 exibe em texto)
        relatorio = f"""
====================================================================
[F12 NETWORK INSPECT - RELATÓRIO TÉCNICO COMPLETO]
====================================================================
📍 URL Alvo: {url}
🔗 URL Final (Após Redirects): {resposta.url}
⚙️ Método: {resposta.request.method}
🔢 Status Code: {resposta.status_code}
⏱️ Tempo de Resposta: {tempo_resposta} ms
--------------------------------------------------------------------
📋 REQUEST HEADERS (Cabeçalhos Enviados):
{json.dumps(dict(resposta.request.headers), indent=2)}
--------------------------------------------------------------------
📋 RESPONSE HEADERS (Cabeçalhos de Resposta / Servidor):
{json.dumps(dict(resposta.headers), indent=2)}
--------------------------------------------------------------------
🍪 COOKIES CAPTURADOS NA SESSÃO:
{dict(resposta.cookies)}
--------------------------------------------------------------------
📥 RESPONSE BODY (O Caminho Reverso / Código Bruto Completo):
{resposta.text[:10000]}
====================================================================
"""
        return jsonify({"status": "sucesso", "relatorio": relatorio})

    except Exception as e:
        erro_detalhado = f"""
====================================================================
[F12 NETWORK INSPECT - ERRO NO CAMINHO REVERSO]
====================================================================
📍 URL Alvo: {url}
❌ Falha ao processar requisição: {str(e)}
====================================================================
"""
        return jsonify({"status": "erro", "detalhes": erro_detalhado}), 500

if __name__ == '__main__':
    porta = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=porta)
