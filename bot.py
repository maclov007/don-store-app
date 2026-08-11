import os
import time
import requests
import json
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/')
def home():
    return "Bot F12 de Inspeção de Checkout está Online!"

@app.route('/analisar', methods=['POST'])
def analisar_checkout():
    dados = request.get_json()
    url = dados.get('url') if dados else None

    if not url:
        return jsonify({"erro": "Nenhuma URL fornecida."}), 400

    headers = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "pt-BR,pt;q=0.9",
        "Connection": "keep-alive"
    }

    try:
        inicio = time.time()
        resposta = requests.get(url, headers=headers, timeout=15)
        fim = time.time()
        
        tempo_resposta = round((fim - inicio) * 1000, 2)

        relatorio = f"""
==================================================
[F12 NETWORK INSPECTOR - NUVEM]
==================================================
📍 URL ALVO: {url}
⚙️ MÉTODO: GET
⏱️ TEMPO DE RESPOSTA: {tempo_resposta} ms
🔢 STATUS CODE: {resposta.status_code}
--------------------------------------------------
📋 HEADERS DE RESPOSTA CAPTURADOS:
{json.dumps(dict(resposta.headers), indent=2)}
--------------------------------------------------
📥 CORPO DA RESPOSTA (CAMINHO REVERSO / PAYLOAD):
{resposta.text[:3000]}
==================================================
"""
        return jsonify({"status": "sucesso", "relatorio": relatorio})

    except Exception as e:
        return jsonify({"status": "erro", "detalhes": str(e)}), 500

if __name__ == '__main__':
    porta = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=porta)
