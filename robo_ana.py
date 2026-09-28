import os
import json
import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
import firebase_admin
from firebase_admin import credentials, firestore

# Inicializa o Firebase
firebase_key = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
if firebase_key:
    cred = credentials.Certificate(json.loads(firebase_key))
else:
    # Fallback para teste local
    cred = credentials.Certificate("serviceAccountKey.json")

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

estacoes = [
    {"codigo": "17900000"},
    {"codigo": "17730000"},
    {"codigo": "17050001"},
    {"codigo": "29050000"},
    {"codigo": "18950003"},
    {"codigo": "16900000"},
    {"codigo": "18390000"},
    {"codigo": "16500000"},
    {"codigo": "18936000"},
    {"codigo": "29680090"},
    {"codigo": "18850000"}
]

def fetch_telemetry(codigo, start_date, end_date):
    url = f"http://telemetriaws1.ana.gov.br/ServiceANA.asmx/DadosHidrometeorologicos"
    params = {
        "codEstacao": codigo,
        "dataInicio": start_date.strftime("%d/%m/%Y"),
        "dataFim": end_date.strftime("%d/%m/%Y")
    }
    print(f"  Buscando ANA {codigo}: {params['dataInicio']} a {params['dataFim']}...")
    try:
        resp = requests.get(url, params=params, timeout=60)
        if resp.status_code == 200:
            return resp.text
    except Exception as e:
        print(f"  Erro na requisição: {e}")
    return None

def parse_telemetry(xml_text):
    data_points = {}
    try:
        root = ET.fromstring(xml_text)
        for row in root.findall(".//DadosHidrometereologicos"):
            dh = row.findtext("DataHora")
            nivel = row.findtext("Nivel")
            if dh and nivel:
                dt = datetime.strptime(dh[:10], "%Y-%m-%d")
                n = float(nivel)
                dt_str = dt.strftime("%Y-%m-%d")
                if dt_str not in data_points:
                    data_points[dt_str] = []
                data_points[dt_str].append(n)
    except Exception as e:
        pass
    return data_points

def update_station(est):
    codigo = est['codigo']
    today = datetime.now()
    current_year = str(today.year)
    
    doc_ref = db.collection('stations').document(codigo).collection('yearly_readings').document(current_year)
    doc_snap = doc_ref.get()
    
    # Descobre a última data salva neste ano
    last_date = datetime(today.year, 1, 1)
    readings = {}
    
    if doc_snap.exists:
        data = doc_snap.to_dict()
        if 'readings' in data:
            readings = data['readings']
            keys = sorted(readings.keys())
            if keys:
                # O formato da chave é MM-DD
                last_mm_dd = keys[-1]
                last_m, last_d = last_mm_dd.split('-')
                last_date = datetime(today.year, int(last_m), int(last_d))
    
    # Se já está atualizado, avança
    if last_date >= today - timedelta(days=1):
        print(f"Estação {codigo} já está atualizada.")
        return
        
    # Busca dados desde a última data
    xml_text = fetch_telemetry(codigo, last_date, today)
    if xml_text:
        chunk_data = parse_telemetry(xml_text)
        updates = {}
        for dt_str, vals in chunk_data.items():
            dt = datetime.strptime(dt_str, "%Y-%m-%d")
            # Salva no formato MM-DD
            md_key = dt.strftime("%m-%d")
            # Faz a média diária
            avg = round(sum(vals) / len(vals), 2)
            updates[md_key] = avg
            
        if updates:
            print(f"  Atualizando {len(updates)} dias para a estação {codigo}...")
            # Atualiza o documento no Firebase
            doc_ref.set({
                'readings': updates
            }, merge=True)
        else:
            print(f"  Nenhum dado novo retornado pela ANA para {codigo}.")

def main():
    print("Iniciando Robô de Atualização ANA -> Firebase")
    for est in estacoes:
        update_station(est)
    print("Sincronização concluída!")

if __name__ == "__main__":
    main()
