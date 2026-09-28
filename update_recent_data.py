import os
import csv
import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta

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
backup_dir = "backup"

def get_max_date(csv_path):
    if not os.path.exists(csv_path):
        return None
    max_date = None
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader, None)
        for row in reader:
            if not row or not row[0]: continue
            try:
                dt = datetime.strptime(row[0], '%Y-%m-%d')
                if not max_date or dt > max_date:
                    max_date = dt
            except:
                pass
    return max_date

def fetch_telemetry(codigo, start_date, end_date):
    url = f"http://telemetriaws1.ana.gov.br/ServiceANA.asmx/DadosHidrometeorologicos"
    params = {
        "codEstacao": codigo,
        "dataInicio": start_date.strftime("%d/%m/%Y"),
        "dataFim": end_date.strftime("%d/%m/%Y")
    }
    print(f"    Buscando de {params['dataInicio']} a {params['dataFim']}...")
    try:
        resp = requests.get(url, params=params, timeout=120)
        if resp.status_code == 200:
            return resp.text
        else:
            print(f"    Erro API: {resp.status_code}")
            return None
    except Exception as e:
        print(f"    Timeout/Exceção: {e}")
        return None

def parse_telemetry(xml_text):
    data_points = {}
    try:
        root = ET.fromstring(xml_text)
        for row in root.findall(".//DadosHidrometereologicos"):
            dh = row.findtext("DataHora")
            nivel = row.findtext("Nivel")
            if dh and nivel:
                try:
                    # DataHora comes as 'YYYY-MM-DD HH:MM:SS'
                    dt = datetime.strptime(dh[:10], "%Y-%m-%d")
                    n = float(nivel)
                    dt_str = dt.strftime("%Y-%m-%d")
                    if dt_str not in data_points:
                        data_points[dt_str] = []
                    data_points[dt_str].append(n)
                except:
                    pass
    except Exception as e:
        print(f"    Erro parse XML: {e}")
    return data_points

def main():
    os.makedirs(backup_dir, exist_ok=True)
    today = datetime.now()

    for est in estacoes:
        print(f"\nProcessando {est['nome']}...")
        csv_path = os.path.join(base_dir, est["rio"], est["nome"], "serie_historica.csv")
        
        max_date = get_max_date(csv_path)
        if not max_date:
            print("  CSV não encontrado ou vazio. Usando 2015-01-01.")
            max_date = datetime(2015, 1, 1)
            
        print(f"  Última data na base: {max_date.strftime('%Y-%m-%d')}")
        
        # We start from max_date to today, in chunks of 14 days
        current_start = max_date
        all_new_data = {}
        
        while current_start < today:
            current_end = current_start + timedelta(days=14)
            if current_end > today:
                current_end = today
                
            xml_text = fetch_telemetry(est['codigo'], current_start, current_end)
            if xml_text:
                chunk_data = parse_telemetry(xml_text)
                for date_str, vals in chunk_data.items():
                    if date_str not in all_new_data:
                        all_new_data[date_str] = []
                    all_new_data[date_str].extend(vals)
            
            # move to next chunk
            current_start = current_end + timedelta(days=1)
            
        if not all_new_data:
            print("  Nenhum dado novo encontrado.")
            continue
            
        # calculate daily averages
        daily_averages = []
        for d, vals in all_new_data.items():
            avg = sum(vals) / len(vals)
            daily_averages.append((d, round(avg, 2)))
            
        daily_averages.sort(key=lambda x: x[0])
        
        # Save to backup
        backup_csv = os.path.join(backup_dir, f"recent_{est['codigo']}.csv")
        with open(backup_csv, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(["Data", "Cota"])
            for row in daily_averages:
                writer.writerow(row)
        print(f"  Salvo em backup: {backup_csv} ({len(daily_averages)} dias)")
        
        # Merge with original
        existing_dates = set()
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            next(reader, None)
            for row in reader:
                if row and row[0]:
                    existing_dates.add(row[0])
                    
        # Append new dates
        added_count = 0
        with open(csv_path, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            for d, cota in daily_averages:
                if d not in existing_dates:
                    writer.writerow([d, cota])
                    added_count += 1
                    
        print(f"  Atualizado {csv_path} com {added_count} novos registros.")

if __name__ == "__main__":
    main()
