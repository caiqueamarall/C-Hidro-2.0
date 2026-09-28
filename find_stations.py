import requests
import xml.etree.ElementTree as ET

def search_by_river(rio):
    url = "http://telemetriaws1.ana.gov.br/ServiceANA.asmx/HidroInventario"
    params = {"codEstMontante": "", "codEstJusante": "", "tpEst": "1", "nmEst": "", "nmRio": rio, "codBacia": "", "codSubBacia": "", "codPrograma": "", "codOrigemInst": "", "codCorp": "", "telemetrica": ""}
    resp = requests.get(url, params=params)
    if resp.status_code != 200:
        print(f"Erro {resp.status_code}")
        return
        
    try:
        root = ET.fromstring(resp.text)
        print(f"--- Estações no rio {rio} ---")
        for est in root.findall(".//Table"):
            cod = est.findtext("Codigo")
            nm = est.findtext("Nome")
            if "tucurui" in nm.lower() or "tucuruí" in nm.lower():
                print(f"  -> {nm} ({cod})")
    except Exception as e:
        print(f"Erro parse: {e}")

search_by_river("Tocantins")
