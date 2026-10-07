import fs from 'fs';
import path from 'path';
import { parseStringPromise } from 'xml2js';

const ESTACOES_PATH = path.join(process.cwd(), 'public', 'estacoes.json');

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
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (response.ok) {
            return await response.text();
        }
    } catch (e) {
        // ignore errors (timeout or network)
    }
    return null;
}

async function getLatestANA(codigo) {
    const today = new Date();
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 3); // fetch last 3 days to be safe
    
    const xmlText = await fetchTelemetry(codigo, threeDaysAgo, today);
    if (!xmlText) return null;
    
    try {
        const result = await parseStringPromise(xmlText);
        const rows = result.DataTable?.['diffgr:diffgram']?.[0]?.DocumentElement?.[0]?.DadosHidrometereologicos || [];
        
        let latestData = null;
        let latestDateObj = new Date(0);
        
        for (const row of rows) {
            const dh = row.DataHora?.[0];
            const nivel = row.Nivel?.[0];
            if (dh && nivel) {
                const n = parseFloat(nivel);
                if (!isNaN(n)) {
                    // dh format: "2026-10-07 05:30:00" -> ANA API returns Brasilia time.
                    // Let's create an ISO string. 05:30 BRT is 08:30 UTC.
                    // Replace space with T, append -03:00.
                    const dateObj = new Date(dh.replace(' ', 'T') + '-03:00');
                    if (dateObj > latestDateObj) {
                        latestDateObj = dateObj;
                        latestData = {
                            dateIso: dateObj.toISOString(),
                            nivel: n
                        };
                    }
                }
            }
        }
        return latestData;
    } catch (e) {
        return null;
    }
}

async function main() {
    console.log("Lendo estacoes.json...");
    if (!fs.existsSync(ESTACOES_PATH)) {
        console.error("estacoes.json não encontrado!");
        process.exit(1);
    }
    
    const rawData = fs.readFileSync(ESTACOES_PATH, 'utf-8');
    const estacoes = JSON.parse(rawData);
    
    console.log(`Buscando dados recentes da ANA para ${estacoes.length} estações...`);
    
    const BATCH_SIZE = 15;
    let updatedCount = 0;
    
    for (let i = 0; i < estacoes.length; i += BATCH_SIZE) {
        const batch = estacoes.slice(i, i + BATCH_SIZE);
        const promises = batch.map(async (est) => {
            const latest = await getLatestANA(est.codigo);
            if (latest) {
                const currentStr = est.dataHoraUltimaMedicao;
                let shouldUpdate = false;
                if (!currentStr) {
                    shouldUpdate = true;
                } else {
                    const currentObj = new Date(currentStr);
                    const anaObj = new Date(latest.dateIso);
                    if (anaObj > currentObj) {
                        shouldUpdate = true;
                    }
                }
                
                if (shouldUpdate) {
                    est.dataHoraUltimaMedicao = latest.dateIso;
                    est.cotaUltimaMedicao = latest.nivel;
                    
                    if (!est.cotaDataAtual) {
                        est.cotaDataAtual = { minima: latest.nivel, media: latest.nivel, maxima: latest.nivel, total: 1, soma: latest.nivel };
                    } else {
                        const currentCota = est.cotaDataAtual;
                        currentCota.minima = Math.min(currentCota.minima, latest.nivel);
                        currentCota.maxima = Math.max(currentCota.maxima, latest.nivel);
                        currentCota.soma += latest.nivel;
                        currentCota.total += 1;
                        currentCota.media = Math.round((currentCota.soma / currentCota.total) * 100) / 100;
                    }
                    updatedCount++;
                }
            }
        });
        await Promise.all(promises);
        console.log(`Progresso: ${Math.min(i + BATCH_SIZE, estacoes.length)}/${estacoes.length}`);
    }
    
    // We do NOT dump as formatted JSON because previously it was unformatted (79KB), let's keep it compact.
    fs.writeFileSync(ESTACOES_PATH, JSON.stringify(estacoes), 'utf-8');
    console.log(`Sucesso! ${updatedCount} estações atualizadas com dados em tempo real da ANA.`);
}

main().catch(console.error);
