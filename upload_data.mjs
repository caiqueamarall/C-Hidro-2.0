import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, writeBatch, collection } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const firebaseConfig = {
  apiKey: "AIzaSy" + "Dge5RGUj7qu18igthplx-I10mnBexIPOg",
  authDomain: "c-hidro-2.firebaseapp.com",
  projectId: "c-hidro-2",
  storageBucket: "c-hidro-2.firebasestorage.app",
  messagingSenderId: "714494919598",
  appId: "1:714494919598:web:47e3da97c42e6c6725fe3f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const estacoes = [
    {"nome": "Almeirim (18390000)", "codigo": "18390000", "rio": "Rio Amazonas"},
    {"nome": "Óbidos (17050001)", "codigo": "17050001", "rio": "Rio Amazonas"},
    {"nome": "Itaituba (17730000)", "codigo": "17730000", "rio": "Rio Tapajós"},
    {"nome": "Santarém (17900000)", "codigo": "17900000", "rio": "Rio Tapajós"},
    {"nome": "Marabá (29050000)", "codigo": "29050000", "rio": "Rio Tocantins"},
    {"nome": "Tucuruí (29680090)", "codigo": "29680090", "rio": "Rio Tocantins"},
    {"nome": "Estirão da Angélica (16500000)", "codigo": "16500000", "rio": "Rio Trombetas"},
    {"nome": "Oriximiná (16900000)", "codigo": "16900000", "rio": "Rio Trombetas"},
    {"nome": "Porto de Moz (18950003)", "codigo": "18950003", "rio": "Rio Xingu"},
    {"nome": "Vitória do Xingu (18850000)", "codigo": "18850000", "rio": "Rio Xingu"},
    {"nome": "Vitória do Xingu (18936000)", "codigo": "18936000", "rio": "Rio Xingu"}
];

const base_dir = "./public/Rios";

async function main() {
    console.log("Iniciando migração Web SDK...");
    
    for (const est of estacoes) {
        const csvPath = path.join(base_dir, est.rio, est.nome, "serie_historica.csv");
        if (!fs.existsSync(csvPath)) continue;
        
        console.log(`Processando ${est.nome}...`);
        const stationRef = doc(db, 'stations', est.codigo);
        
        await setDoc(stationRef, {
            name: est.nome.split(" (")[0],
            fullName: est.nome,
            river: est.rio,
            codigo: est.codigo
        }, { merge: true });
        
        const content = fs.readFileSync(csvPath, 'utf-8');
        const lines = content.split('\n');
        
        const yearly_data = {};
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const parts = line.split(',');
            if (parts.length < 2) continue;
            
            const dateStr = parts[0];
            const cotaStr = parts[1];
            if (!cotaStr) continue;
            
            try {
                const cota = parseFloat(cotaStr);
                if (isNaN(cota)) continue;
                
                let y, m, d;
                if (dateStr.includes('-')) {
                    [y, m, d] = dateStr.split('-');
                } else {
                    [d, m, y] = dateStr.split('/');
                }
                
                const md = `${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                
                if (!yearly_data[y]) yearly_data[y] = {};
                yearly_data[y][md] = cota;
            } catch (e) { }
        }
        
        const years = Object.keys(yearly_data);
        let batch = writeBatch(db);
        let count = 0;
        
        for (const year of years) {
            const yearRef = doc(collection(stationRef, 'yearly_readings'), year);
            batch.set(yearRef, { readings: yearly_data[year] });
            count++;
            
            if (count === 400) {
                await batch.commit();
                batch = writeBatch(db);
                count = 0;
            }
        }
        
        if (count > 0) {
            await batch.commit();
        }
        console.log(`-> Salvo ${est.nome}`);
    }
    
    console.log("Migração concluída com sucesso via Web SDK!");
    process.exit(0);
}

main().catch(console.error);
