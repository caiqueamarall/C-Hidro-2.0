import csv
import os

file_path = "public/Rios/Rio Tocantins/Marabá (29050000)/serie_historica.csv"

if not os.path.exists(file_path):
    print(f"File not found: {file_path}")
    exit(1)

with open(file_path, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    header = next(reader)
    rows = list(reader)

original_len = len(rows)

# Exclude dates from 1982-03-29 to 1983-03-04 inclusive
filtered_rows = []
for row in rows:
    if len(row) > 0:
        date_str = row[0]
        if not ('1982-03-29' <= date_str <= '1983-03-04'):
            filtered_rows.append(row)

with open(file_path, 'w', encoding='utf-8', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(header)
    writer.writerows(filtered_rows)

print(f"Cleaned {file_path}. Original: {original_len}, New: {len(filtered_rows)}. Removed: {original_len - len(filtered_rows)}")
