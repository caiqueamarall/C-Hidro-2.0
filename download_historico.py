import os
import requests
import xml.etree.ElementTree as ET
import csv
from datetime import datetime
import calendar

estacoes = [
    {"nome": "Santarém (17900000)", "codigo": "17900000", "rio": "Rio Tapajós"},
    {"nome": "Itaituba (17730000)", "codigo": "17730000", "rio": "Rio Tapajós"},
    {"nome": "Óbidos (17050001)", "codigo": "17050001", "rio": "Rio Amazonas"},
    {"nome": "Marabá (29050000)", "codigo": "29050000", "rio": "Rio Tocantins"},
    {"nome": "Porto de Moz (18950003)", "codigo": "18950003", "rio": "Rio Xingu"},
    {"nome": "Oriximiná (16900000)", "codigo": "16900000", "rio": "Rio Trombetas"},
    {"nome": "Almeirim (18390000)", "codigo": "18390000", "rio": "Rio Amazonas"}
]

base_dir = "Rios"

def parse_xml_to_csv(xml_text, csv_path):
    root = ET.fromstring(xml_text)
    
    # List to hold (date, cota) tuples
    data_points = []
    
    for serie in root.findall(".//SerieHistorica"):
        # TipoDados = 1 is Cota, 2 is Chuva. We only process Cota (TipoDados=1)
        data_str = serie.findtext("DataHora")
        if not data_str:
            continue
            
        # DataHora is usually 'YYYY-MM-01 00:00:00'
        dt = datetime.strptime(data_str[:10], "%Y-%m-%d")
        year = dt.year
        month = dt.month
        
        # Get number of days in the month
        _, num_days = calendar.monthrange(year, month)
        
        for day in range(1, num_days + 1):
            cota_tag = f"Cota{day:02d}"
            cota_val = serie.findtext(cota_tag)
            
            if cota_val is not None and cota_val.strip() != "":
                date_str = f"{year}-{month:02d}-{day:02d}"
                data_points.append((date_str, cota_val.strip()))
                
    # Sort data points by date
    data_points.sort(key=lambda x: x[0])
    
    with open(csv_path, "w", newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["Data", "Cota"])
        for dp in data_points:
            writer.writerow(dp)

def main():
    os.makedirs(base_dir, exist_ok=True)
    
    for est in estacoes:
        print(f"Baixando dados para {est['nome']} ({est['rio']})...")
        rio_dir = os.path.join(base_dir, est["rio"])
        est_dir = os.path.join(rio_dir, est["nome"])
        os.makedirs(est_dir, exist_ok=True)
        
        url = f"http://telemetriaws1.ana.gov.br/ServiceANA.asmx/HidroSerieHistorica?codEstacao={est['codigo']}&dataInicio=&dataFim=&tipoDados=1&nivelConsistencia="
        
        try:
            resp = requests.get(url, timeout=60)
            if resp.ok:
                csv_path = os.path.join(est_dir, "serie_historica.csv")
                parse_xml_to_csv(resp.text, csv_path)
                print(f" -> Salvo com sucesso em {csv_path}")
            else:
                print(f" -> Erro ao baixar da API (Status: {resp.status_code})")
        except Exception as e:
            print(f" -> Exceção: {e}")

if __name__ == "__main__":
    main()
