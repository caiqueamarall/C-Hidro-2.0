import csv
from datetime import datetime

csv_path = 'public/Rios/Rio Tocantins/Marabá (29050000)/serie_historica.csv'

with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    next(reader) # skip header
    
    last_date = None
    gaps = []
    
    for row in reader:
        if not row:
            continue
        try:
            curr_date = datetime.strptime(row[0], '%Y-%m-%d')
        except:
            continue
            
        if last_date:
            diff = (curr_date - last_date).days
            if diff > 1:
                gaps.append((last_date.strftime('%Y-%m-%d'), curr_date.strftime('%Y-%m-%d'), diff))
        last_date = curr_date

gaps.sort(key=lambda x: x[2], reverse=True)
print("Top 10 gaps:")
for g in gaps[:10]:
    print(g)
