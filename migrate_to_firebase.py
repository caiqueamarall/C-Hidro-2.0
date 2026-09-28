import os
import csv
from datetime import datetime
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

# Mapeamento das estações (mesmo que usamos nos outros scripts)
estacoes = [
    {"nome": "Santarém (17900000)", "codigo": "17900000", "rio": "Rio Tapajós"},
    {"nome": "Itaituba (17730000)", "codigo": "17730000", "rio": "Rio Tapajós"},
    {"nome": "Óbidos (17050001)", "codigo": "17050001", "rio": "Rio Amazonas"},
    {"nome": "Marabá (29050000)", "codigo": "29050000", "rio": "Rio Tocantins"},
    {"nome": "Porto de Moz (18950003)", "codigo": "18950003", "rio": "Rio Xingu"},
    {"nome": "Oriximiná (16900000)", "codigo": "16900000", "rio": "Rio Trombetas"},
    {"nome": "Almeirim (18390000)", "codigo": "18390000", "rio": "Rio Amazonas"},
    {"nome": "Estirão da Angélica (16500000)", "codigo": "16500000", "rio": "Rio Trombetas"},
    {"nome": "Vitória do Xingu (18936000)", "codigo": "18936000", "rio": "Rio Xingu"},
    {"nome": "Tucuruí (29680090)", "codigo": "29680090", "rio": "Rio Tocantins"}
]

base_dir = "public/Rios"

def main():
    print("Iniciando migração para o Firebase...")
    
    # 1. Inicializa o Firebase
    # Certifique-se de que o arquivo serviceAccountKey.json está na mesma pasta do script
    if not os.path.exists("serviceAccountKey.json"):
        print("ERRO: Arquivo serviceAccountKey.json não encontrado!")
        print("Vá no Console do Firebase > Configurações do Projeto > Contas de Serviço > Gerar nova chave privada.")
        return

    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()

    for est in estacoes:
        csv_path = os.path.join(base_dir, est["rio"], est["nome"], "serie_historica.csv")
        
        if not os.path.exists(csv_path):
            print(f"[{est['nome']}] Arquivo ignorado (não encontrado): {csv_path}")
            continue
            
        print(f"Processando {est['nome']}...")
        
        # Cria ou atualiza o documento da estação principal
        station_ref = db.collection('stations').document(est['codigo'])
        station_ref.set({
            'name': est['nome'].split(" (")[0], # Ex: "Santarém"
            'fullName': est['nome'],
            'river': est['rio'],
            'codigo': est['codigo']
        }, merge=True)
        
        # Dicionário para agrupar por ano
        # yearly_data = { "2026": { "09-28": 312.45, ... }, ... }
        yearly_data = {}
        
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            next(reader, None) # skip header
            
            for row in reader:
                if len(row) < 2 or not row[0] or not row[1]:
                    continue
                try:
                    cota = float(row[1])
                    date_str = row[0] # Ex: "2026-09-28"
                    
                    y, m, d = date_str.split('-')
                    if len(y) != 4:
                        # Em caso de datas em formato dd/mm/yyyy
                        d, m, y = date_str.split('/')
                        
                    mm_dd = f"{m.zfill(2)}-{d.zfill(2)}"
                    
                    if y not in yearly_data:
                        yearly_data[y] = {}
                        
                    yearly_data[y][mm_dd] = cota
                except Exception as e:
                    pass
                    
        # Agora manda cada ano para o Firestore como um documento em lote (Batch)
        batch = db.batch()
        count = 0
        
        for year, readings in yearly_data.items():
            year_ref = station_ref.collection('yearly_readings').document(year)
            batch.set(year_ref, { 'readings': readings }, merge=True)
            count += 1
            
            # Firestore batches limit = 500
            if count == 400:
                batch.commit()
                batch = db.batch()
                count = 0
                
        if count > 0:
            batch.commit()
            
        print(f"[{est['nome']}] Concluído! {len(yearly_data)} anos de histórico importados.")

if __name__ == "__main__":
    main()
