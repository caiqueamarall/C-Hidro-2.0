import os
import requests
import xml.etree.ElementTree as ET
import csv
import datetime
import calendar

def parse_xml_to_csv(xml_text, csv_path):
    root = ET.fromstring(xml_text)
    data_points = []
    for serie in root.findall('.//SerieHistorica'):
        data_str = serie.findtext('DataHora')
        if not data_str: continue
        dt = datetime.datetime.strptime(data_str[:10], '%Y-%m-%d')
        year = dt.year
        month = dt.month
        _, num_days = calendar.monthrange(year, month)
        for day in range(1, num_days + 1):
            cota_val = serie.findtext(f'Cota{day:02d}')
            if cota_val and cota_val.strip() != '':
                data_points.append((f'{year}-{month:02d}-{day:02d}', cota_val.strip()))
    data_points.sort(key=lambda x: x[0])
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Data', 'Cota'])
        for dp in data_points:
            writer.writerow(dp)

est_dir = 'public/Rios/Rio Amazonas/Almeirim (18390000)'
os.makedirs(est_dir, exist_ok=True)
url = 'http://telemetriaws1.ana.gov.br/ServiceANA.asmx/HidroSerieHistorica?codEstacao=18390000&dataInicio=&dataFim=&tipoDados=1&nivelConsistencia='
resp = requests.get(url, timeout=60)
if resp.ok:
    parse_xml_to_csv(resp.text, os.path.join(est_dir, 'serie_historica.csv'))
    print('Almeirim downloaded to public/Rios!')
else:
    print('Failed to download Almeirim')
