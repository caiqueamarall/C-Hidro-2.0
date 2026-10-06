import { parseStringPromise } from 'xml2js';

async function test() {
    const startStr = '30/09/2026';
    const endStr = '06/10/2026';
    const codigo = '17050001';
    const url = `http://telemetriaws1.ana.gov.br/ServiceANA.asmx/DadosHidrometeorologicos?codEstacao=${codigo}&dataInicio=${startStr}&dataFim=${endStr}`;
    const res = await fetch(url);
    const text = await res.text();
    console.log("RESPONSE HTTP STATUS:", res.status);
    console.log("TEXT START:", text.substring(0, 100));
    
    // Attempt parse
    try {
        const result = await parseStringPromise(text);
        const rows = result.DataTable?.['diffgr:diffgram']?.[0]?.DocumentElement?.[0]?.DadosHidrometereologicos || [];
        console.log("Parsed rows count:", rows.length);
        if (rows.length > 0) {
            console.log("First row:", rows[0].DataHora[0], rows[0].Nivel?.[0]);
            console.log("Last row:", rows[rows.length-1].DataHora[0], rows[rows.length-1].Nivel?.[0]);
        }
    } catch (e) {
        console.error("Parse error:", e);
    }
}
test().catch(console.error);
