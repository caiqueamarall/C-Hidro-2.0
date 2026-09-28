import requests
import xml.etree.ElementTree as ET

url = "http://telemetriaws1.ana.gov.br/ServiceANA.asmx/DadosHidrometeorologicos"
params = {
    "codEstacao": "29680090",
    "dataInicio": "01/01/2026",
    "dataFim": "28/09/2026"
}
resp = requests.get(url, params=params)
try:
    root = ET.fromstring(resp.text)
    error = root.find(".//Error")
    if error is not None:
        print(f"Erro: {error.text}")
    else:
        dados = root.findall(".//DadosHidrometereologicos")
        print(f"BINGO! Encontrados {len(dados)} registros recentes!")
        if len(dados) > 0:
            print("Exemplo:", dados[0].findtext("DataHora"), dados[0].findtext("Nivel"))
except Exception as e:
    print(e)
