import csv
import os

file_path = "public/Rios/Rio Trombetas/Oriximiná (16900000)/serie_historica.csv"

if not os.path.exists(file_path):
    print(f"File not found: {file_path}")
    exit(1)

with open(file_path, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    header = next(reader)
    rows = list(reader)

original_len = len(rows)

# Filter out dates before 1970-10-01
# Dates are in YYYY-MM-DD format
filtered_rows = [row for row in rows if len(row) > 0 and row[0] >= '1970-10-01']

with open(file_path, 'w', encoding='utf-8', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(header)
    writer.writerows(filtered_rows)

print(f"Truncated {file_path}. Original: {original_len}, New: {len(filtered_rows)}.")
