import { parseStringPromise } from 'xml2js';

function formatDateBr(date) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
}

async function getLatestANA(codigo) {
    const today = new Date();
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 3);
    
    const startStr = formatDateBr(threeDaysAgo);
    const endStr = formatDateBr(today);
    const url = `http://telemetriaws1.ana.gov.br/ServiceANA.asmx/DadosHidrometeorologicos?codEstacao=${codigo}&dataInicio=${startStr}&dataFim=${endStr}`;
    console.log(url);
    
    try {
        const response = await fetch(url);
        if (response.ok) {
            const xmlText = await response.text();
            console.log(xmlText.substring(0, 300));
            const result = await parseStringPromise(xmlText);
            const rows = result.DataTable?.['diffgr:diffgram']?.[0]?.DocumentElement?.[0]?.DadosHidrometereologicos || [];
            
            console.log("Linhas:", rows.length);
            let latestData = null;
            let latestDateObj = new Date(0);
            
            for (const row of rows) {
                const dh = row.DataHora?.[0];
                const nivel = row.Nivel?.[0];
                if (dh && nivel) {
                    const n = parseFloat(nivel);
                    if (!isNaN(n)) {
                        const dateObj = new Date(dh.replace(' ', 'T') + '-03:00');
                        if (dateObj > latestDateObj) {
                            latestDateObj = dateObj;
                            latestData = { dateIso: dateObj.toISOString(), nivel: n, originalDt: dh };
                        }
                    }
                }
            }
            return latestData;
        }
    } catch (e) {
        console.error(e);
    }
    return null;
}

getLatestANA('18850000').then(console.log);
