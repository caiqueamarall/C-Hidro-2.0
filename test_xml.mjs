import { parseStringPromise } from 'xml2js';

const xml = `<?xml version="1.0" encoding="utf-8"?>
<DataTable xmlns="http://telemetriaws1.ana.gov.br/ServiceANA.asmx">
  <diffgr:diffgram xmlns:msdata="urn:schemas-microsoft-com:xml-msdata" xmlns:diffgr="urn:schemas-microsoft-com:xml-diffgram-v1">
    <DocumentElement>
      <DadosHidrometereologicos>
        <CodEstacao>17900000</CodEstacao>
        <DataHora>2026-09-28T07:00:00-03:00</DataHora>
        <Nivel>123</Nivel>
      </DadosHidrometereologicos>
    </DocumentElement>
  </diffgr:diffgram>
</DataTable>`;

async function test() {
  const result = await parseStringPromise(xml);
  console.log(JSON.stringify(result, null, 2));
  const rows = result.DataTable?.['diffgr:diffgram']?.[0]?.DocumentElement?.[0]?.DadosHidrometereologicos || [];
  console.log('Found rows:', rows.length);
}
test();
