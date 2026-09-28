import os
import csv
import glob

base_dir = "public/Rios"

def process_file(filepath):
    print(f"Processando {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        rows = list(reader)
        
    if not rows:
        return
        
    header = rows[0]
    new_rows = [header]
    
    for row in rows[1:]:
        if len(row) < 2 or not row[0]:
            continue
            
        date_str = row[0]
        # Data pode estar como 2026-09-28 ou 28/09/2026
        try:
            if '-' in date_str:
                y, m, d = date_str.split('-')
            else:
                d, m, y = date_str.split('/')
            
            if int(y) >= 2005:
                new_rows.append(row)
        except:
            pass
            
    with open(filepath, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerows(new_rows)
        
    print(f"-> Salvo. Registros mantidos: {len(new_rows) - 1}")

def main():
    csv_files = glob.glob(os.path.join(base_dir, "**", "serie_historica.csv"), recursive=True)
    for filepath in csv_files:
        process_file(filepath)
        
    print("Concluído! Todos os arquivos foram limitados a partir de 2005.")

if __name__ == "__main__":
    main()
