import os
import csv
import math
from datetime import datetime

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

meses_nomes = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", 
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
]

def main():
    for est in estacoes:
        csv_path = os.path.join(base_dir, est["rio"], est["nome"], "serie_historica.csv")
        out_path = os.path.join(base_dir, est["rio"], est["nome"], "estatisticas.csv")
        
        if not os.path.exists(csv_path):
            print(f"[{est['nome']}] Arquivo não encontrado: {csv_path}")
            continue
            
        print(f"Processando {est['nome']}...")
        
        # 1. First, group by day to get daily averages (in case of duplicates)
        daily_data = {}
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            next(reader, None) # skip header
            for row in reader:
                if len(row) < 2 or not row[0] or not row[1]:
                    continue
                try:
                    cota = float(row[1])
                    dt = datetime.strptime(row[0], '%Y-%m-%d')
                    dt_str = dt.strftime('%Y-%m-%d')
                    
                    if dt_str not in daily_data:
                        daily_data[dt_str] = []
                    daily_data[dt_str].append(cota)
                except:
                    pass
                    
        # Compute daily averages
        daily_averages = {}
        for d, vals in daily_data.items():
            daily_averages[d] = sum(vals) / len(vals)
            
        # 2. Group daily averages by month (1 to 12)
        monthly_values = {m: [] for m in range(1, 13)}
        for d, avg_cota in daily_averages.items():
            month = int(d.split('-')[1])
            monthly_values[month].append(avg_cota)
            
        # 3. Calculate mean and population std dev for each month
        stats = []
        for m in range(1, 13):
            vals = monthly_values[m]
            if len(vals) > 0:
                mean = sum(vals) / len(vals)
                sum_sq_diff = sum((v - mean) ** 2 for v in vals)
                std_dev = math.sqrt(sum_sq_diff / len(vals))
            else:
                mean = 0.0
                std_dev = 0.0
                
            stats.append({
                "mes_num": m,
                "mes_nome": meses_nomes[m - 1],
                "media": round(mean, 2),
                "desvio_padrao": round(std_dev, 2),
                "dp_pos_1": round(mean + 1 * std_dev, 2),
                "dp_pos_1_5": round(mean + 1.5 * std_dev, 2),
                "dp_pos_2": round(mean + 2 * std_dev, 2),
                "dp_pos_3": round(mean + 3 * std_dev, 2),
                "dp_neg_1": round(mean - 1 * std_dev, 2),
                "dp_neg_1_5": round(mean - 1.5 * std_dev, 2),
                "dp_neg_2": round(mean - 2 * std_dev, 2),
                "dp_neg_3": round(mean - 3 * std_dev, 2)
            })
            
        # 4. Save to estatisticas.csv
        with open(out_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                "MesNum", "MesNome", "Media", "DesvioPadrao",
                "DP_Pos_1", "DP_Pos_1_5", "DP_Pos_2", "DP_Pos_3",
                "DP_Neg_1", "DP_Neg_1_5", "DP_Neg_2", "DP_Neg_3"
            ])
            for st in stats:
                writer.writerow([
                    st["mes_num"], st["mes_nome"], st["media"], st["desvio_padrao"],
                    st["dp_pos_1"], st["dp_pos_1_5"], st["dp_pos_2"], st["dp_pos_3"],
                    st["dp_neg_1"], st["dp_neg_1_5"], st["dp_neg_2"], st["dp_neg_3"]
                ])
                
        print(f" -> Estatísticas geradas com sucesso ({out_path})")

if __name__ == "__main__":
    main()
