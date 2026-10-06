import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection } from 'firebase/firestore';
import { parseStringPromise } from 'xml2js';

// Configuração Web do Firebase (bypassa o bloqueio da Conta de Serviço)
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
    {"codigo": "17900000", "nome": "Santarém"},
    {"codigo": "17730000", "nome": "Itaituba"},
    {"codigo": "17050001", "nome": "Óbidos"},
    {"codigo": "29050000", "nome": "Marabá"},
    {"codigo": "18950003", "nome": "Porto de Moz"},
    {"codigo": "16900000", "nome": "Oriximiná"},
    {"codigo": "18390000", "nome": "Almeirim"},
    {"codigo": "16500000", "nome": "Estirão da Angélica"},
    {"codigo": "18936000", "nome": "Vitória do Xingu (1)"},
    {"codigo": "29680090", "nome": "Tucuruí"},
    {"codigo": "18850000", "nome": "Vitória do Xingu (2)"}
];

function formatDateBr(date) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
}

async function fetchTelemetry(codigo, startDate, endDate) {
    const startStr = formatDateBr(startDate);
    const endStr = formatDateBr(endDate);
    const url = `http://telemetriaws1.ana.gov.br/ServiceANA.asmx/DadosHidrometeorologicos?codEstacao=${codigo}&dataInicio=${startStr}&dataFim=${endStr}`;
    
    console.log(`  Buscando ANA ${codigo}: ${startStr} a ${endStr}...`);
    try {
        const response = await fetch(url);
        if (response.ok) {
            return await response.text();
        } else {
            console.error(`  ANA API retornou erro ${response.status} para ${codigo}`);
        }
    } catch (e) {
        console.error(`  Erro na requisição: ${e.message}`);
    }
    return null;
}

async function parseTelemetry(xmlText) {
    const dataPoints = {};
    try {
        const result = await parseStringPromise(xmlText);
        const rows = result.DataTable?.['diffgr:diffgram']?.[0]?.DocumentElement?.[0]?.DadosHidrometereologicos || [];
        
        for (const row of rows) {
            const dh = row.DataHora?.[0];
            const nivel = row.Nivel?.[0];
            if (dh && nivel) {
                const dtStr = dh.substring(0, 10);
                const n = parseFloat(nivel);
                if (!isNaN(n)) {
                    if (!dataPoints[dtStr]) dataPoints[dtStr] = [];
                    dataPoints[dtStr].push(n);
                }
            }
        }
    } catch (e) {
        console.error("  Erro no parse do XML:", e.message);
    }
    return dataPoints;
}

async function updateStation(est) {
    const codigo = est.codigo;
    const today = new Date();
    const currentYear = today.getFullYear().toString();
    
    const docRef = doc(db, `stations/${codigo}/yearly_readings/${currentYear}`);
    const docSnap = await getDoc(docRef);
    
    let lastDate = new Date(today.getFullYear(), 0, 1);
    let readings = {};
    
    if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.readings) {
            readings = data.readings;
            const keys = Object.keys(readings).sort();
            if (keys.length > 0) {
                const lastMd = keys[keys.length - 1];
                const [m, d] = lastMd.split('-');
                lastDate = new Date(today.getFullYear(), parseInt(m) - 1, parseInt(d));
            }
        }
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastDate >= yesterday) {
        console.log(`Estação ${est.nome} (${codigo}) já está atualizada.`);
        return;
    }
    
    const xmlText = await fetchTelemetry(codigo, lastDate, today);
    if (xmlText) {
        const chunkData = await parseTelemetry(xmlText);
        const updates = {};
        
        for (const [dtStr, vals] of Object.entries(chunkData)) {
            const dtParts = dtStr.split('-');
            const mdKey = `${dtParts[1]}-${dtParts[2]}`;
            const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
            updates[mdKey] = Math.round(avg * 100) / 100;
            readings[mdKey] = updates[mdKey];
        }
        
        if (Object.keys(updates).length > 0) {
            console.log(`  Atualizando ${Object.keys(updates).length} dias para a estação ${est.nome}...`);
            await setDoc(docRef, { readings: readings }, { merge: true });
        } else {
            console.log(`  Nenhum dado novo retornado pela ANA para ${est.nome}.`);
        }
    }
}

async function main() {
    console.log("Iniciando Robô de Atualização ANA -> Firebase (Web SDK)");
    for (const est of estacoes) {
        await updateStation(est);
    }
    console.log("Sincronização concluída!");
    process.exit(0);
}

main().catch(console.error);
