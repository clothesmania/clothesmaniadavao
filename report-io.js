(function () {
    const importState = { records: [], skipped: [], invalid: [], kind: 'orders', filename: '' };
    const amountFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const zipCrcTable = new Uint32Array(256);
    for (let tableIndex = 0; tableIndex < 256; tableIndex++) {
        let value = tableIndex;
        for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
        zipCrcTable[tableIndex] = value >>> 0;
    }

    function crc32(bytes) {
        let crc = 0xffffffff;
        for (const byte of bytes) crc = zipCrcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
        return (crc ^ 0xffffffff) >>> 0;
    }

    function escapeXml(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    }

    function reportScope() {
        if (selectedReportDate) return { dates: [selectedReportDate], label: reportDateLabel(selectedReportDate, { month: 'short', day: 'numeric', year: 'numeric' }) };
        const year = reportMonthCursor.getFullYear();
        const month = reportMonthCursor.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const dates = Array.from({ length: days }, (_, index) => reportDateKey(new Date(year, month, index + 1)));
        return { dates, label: reportMonthCursor.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }) };
    }

    function reportRows() {
        const scope = reportScope();
        const dateSet = new Set(scope.dates);
        const orders = (db.mines || []).filter(mine => dateSet.has(mine.date) && !/^m\d+$/i.test(String(mine.id || '')));
        const daily = scope.dates.map(date => {
            const entry = getDailySheetRecord(date) || { date };
            const day = getReportDayData(date);
            return [
                date,
                entry.afternoonSeller || getReportSessionSeller(date, 'afternoon') || '', Number(entry.afternoon || 0),
                entry.eveningSeller || getReportSessionSeller(date, 'evening') || '', Number(entry.evening || 0),
                Number(entry.walkIn || 0), Number(entry.boxBundle || 0), Number(entry.boost || 0),
                getDailySheetTotal(entry), day.gross, day.collected, day.pending, day.orders.length
            ];
        });
        const liveSessions = scope.dates.flatMap(date => {
            const day = getReportDayData(date);
            return day.sessions.map(session => {
                const summary = getReportSessionSummary(day, session);
                return [date, summary.seller, session.name || 'Live session', summary.mineSales, summary.unpaid, summary.walkIn, summary.boxBundle, summary.fbBoost, summary.totalSales];
            });
        });
        const mineRows = orders.map(mine => {
            const amounts = getReportOrderAmounts(mine);
            return [mine.date || '', mine.time || '', mine.name || '', mine.item || '', mine.seller || '', mine.mop || '', mine.reference || mine.referenceNo || mine.ref || '', mine.status || 'UNPAID', amounts.total, amounts.collected, amounts.balance];
        });
        const totals = orders.filter(isReportableMine).reduce((result, mine) => {
            const amounts = getReportOrderAmounts(mine);
            result.gross += amounts.total;
            result.collected += amounts.collected;
            result.pending += amounts.balance;
            return result;
        }, { gross: 0, collected: 0, pending: 0 });
        const dailySheetTotal = daily.reduce((sum, row) => sum + Number(row[8] || 0), 0);
        const sheetName = selectedReportDate ? 'Daily Report' : 'Report List';
        return {
            ...scope,
            daily,
            orders,
            sheets: [
                { name: sheetName, rows: [['Date', 'Afternoon Seller', 'Afternoon Sales', 'Evening Seller', 'Evening Sales', 'Walk-ins', 'Box Bundle', 'FB Boost', 'Daily Sheet Total', 'Mine Gross Sales', 'Cash Collected', 'Pending Receivables', 'Mine Orders'], ...daily] },
                { name: 'Mine Orders', rows: [['Date', 'Time', 'Buyer', 'Item', 'Live Seller', 'Payment Mode', 'Reference No.', 'Status', 'Order Value', 'Collected', 'Balance'], ...mineRows] },
                { name: 'Financial Summary', rows: [['Report Period', scope.label], ['Daily Sheet Sales', dailySheetTotal], ['Gross Mine Order Value', totals.gross], ['Cash Collected', totals.collected], ['Pending Receivables', totals.pending], ['Mine Orders', orders.filter(isReportableMine).length]] },
                { name: 'Live Sessions', rows: [['Date', 'Live Seller', 'Live Name', 'Mine Sales', 'Unpaid Total', 'Walk-ins', 'Box Bundle', 'FB Boost', 'Total Sales'], ...liveSessions] }
            ]
        };
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function csvCell(value) {
        let text = String(value ?? '');
        if (/^[=+@\-]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text)) text = `'${text}`;
        return `"${text.replace(/"/g, '""')}"`;
    }

    function exportCsv(report) {
        const dailyRows = report.sheets[0].rows.map(row => row.map(csvCell).join(','));
        const orderRows = report.sheets[1].rows.map(row => row.map(csvCell).join(','));
        const sessionRows = report.sheets[3].rows.map(row => row.map(csvCell).join(','));
        const content = `Daily Sales\r\n${dailyRows.join('\r\n')}\r\n\r\nLive Sessions\r\n${sessionRows.join('\r\n')}\r\n\r\nMine Orders\r\n${orderRows.join('\r\n')}`;
        downloadBlob(new Blob(['\ufeff', content], { type: 'text/csv;charset=utf-8' }), `clothes-mania-report-${fileDateRange(report)}.csv`);
    }

    function fileDateRange(report) {
        return selectedReportDate ? selectedReportDate : `${report.dates[0]}_to_${report.dates[report.dates.length - 1]}`;
    }

    function columnName(index) {
        let result = '';
        for (let current = index + 1; current > 0; current = Math.floor((current - 1) / 26)) result = String.fromCharCode(65 + (current - 1) % 26) + result;
        return result;
    }

    function worksheetXml(rows) {
        const content = rows.map((row, rowIndex) => {
            const cells = row.map((value, columnIndex) => {
                const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
                if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}"><v>${value}</v></c>`;
                return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
            }).join('');
            return `<row r="${rowIndex + 1}">${cells}</row>`;
        }).join('');
        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${content}</sheetData></worksheet>`;
    }

    function zipStore(files) {
        const localParts = [];
        const centralParts = [];
        let localOffset = 0;
        const dosDate = ((new Date().getFullYear() - 1980) << 9) | ((new Date().getMonth() + 1) << 5) | new Date().getDate();
        const dosTime = (new Date().getHours() << 11) | (new Date().getMinutes() << 5) | Math.floor(new Date().getSeconds() / 2);
        for (const file of files) {
            const name = encoder.encode(file.name);
            const data = encoder.encode(file.content);
            const crc = crc32(data);
            const local = new Uint8Array(30 + name.length);
            const localView = new DataView(local.buffer);
            localView.setUint32(0, 0x04034b50, true);
            localView.setUint16(4, 20, true);
            localView.setUint16(6, 0x0800, true);
            localView.setUint16(8, 0, true);
            localView.setUint16(10, dosTime, true);
            localView.setUint16(12, dosDate, true);
            localView.setUint32(14, crc, true);
            localView.setUint32(18, data.length, true);
            localView.setUint32(22, data.length, true);
            localView.setUint16(26, name.length, true);
            local.set(name, 30);
            localParts.push(local, data);
            const central = new Uint8Array(46 + name.length);
            const centralView = new DataView(central.buffer);
            centralView.setUint32(0, 0x02014b50, true);
            centralView.setUint16(4, 20, true);
            centralView.setUint16(6, 20, true);
            centralView.setUint16(8, 0x0800, true);
            centralView.setUint16(10, 0, true);
            centralView.setUint16(12, dosTime, true);
            centralView.setUint16(14, dosDate, true);
            centralView.setUint32(16, crc, true);
            centralView.setUint32(20, data.length, true);
            centralView.setUint32(24, data.length, true);
            centralView.setUint16(28, name.length, true);
            centralView.setUint32(42, localOffset, true);
            central.set(name, 46);
            centralParts.push(central);
            localOffset += local.length + data.length;
        }
        const centralLength = centralParts.reduce((sum, part) => sum + part.length, 0);
        const end = new Uint8Array(22);
        const endView = new DataView(end.buffer);
        endView.setUint32(0, 0x06054b50, true);
        endView.setUint16(8, files.length, true);
        endView.setUint16(10, files.length, true);
        endView.setUint32(12, centralLength, true);
        endView.setUint32(16, localOffset, true);
        return new Blob([...localParts, ...centralParts, end], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }

    function makeXlsx(sheets) {
        const worksheetFiles = sheets.map((sheet, index) => ({ name: `xl/worksheets/sheet${index + 1}.xml`, content: worksheetXml(sheet.rows) }));
        const sheetContentTypes = sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('');
        const workbookSheets = sheets.map((sheet, index) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('');
        const workbookRels = sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('');
        return zipStore([
            { name: '[Content_Types].xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheetContentTypes}</Types>` },
            { name: '_rels/.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
            { name: 'xl/workbook.xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>` },
            { name: 'xl/_rels/workbook.xml.rels', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${workbookRels}</Relationships>` },
            ...worksheetFiles
        ]);
    }

    function printReport(report) {
        const popup = window.open('', '_blank');
        if (!popup) {
            showToast('Allow pop-ups to print or save this report as PDF.', true);
            return;
        }
        const daily = report.sheets[0].rows;
        const orders = report.sheets[1].rows;
        const sessions = report.sheets[3].rows;
        const table = rows => {
            const moneyColumns = rows[0].map(header => /sales|walk-ins|bundle|boost|total|collected|receivables|order value|balance/i.test(String(header)));
            return `<table><thead><tr>${rows[0].map(value => `<th>${escapeHtml(value)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map(row => `<tr>${row.map((value, index) => `<td>${escapeHtml(typeof value === 'number' && moneyColumns[index] ? amountFormatter.format(value) : value)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
        };
        popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Clothes Mania Davao · ${escapeHtml(report.label)}</title><style>body{font:12px Arial,sans-serif;color:#111827;margin:28px}h1{font-size:20px;margin:0 0 4px}h2{font-size:14px;margin:24px 0 8px}.muted{color:#64748b;margin:0 0 20px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #d1d5db;padding:6px;text-align:left}th{background:#f3f4f6}td:nth-child(n+3){text-align:right}@media print{body{margin:10mm}h2{break-after:avoid}table{break-inside:auto}tr{break-inside:avoid}}</style></head><body><h1>Clothes Mania Davao · Sales Report</h1><p class="muted">${escapeHtml(report.label)} · Generated ${escapeHtml(new Date().toLocaleString('en-PH'))}</p><h2>Daily Sales</h2>${table(daily)}<h2>Live Sessions</h2>${table(sessions)}<h2>Mine Orders</h2>${table(orders)}<script>window.onload=()=>window.print()</script></body></html>`);
        popup.document.close();
    }

    function toggleMenu(menuId) {
        const menu = document.getElementById(menuId);
        if (!menu) return;
        const shouldOpen = menu.classList.contains('hidden');
        document.querySelectorAll('#reportExportMenu, #reportDayExportMenu').forEach(other => {
            other.classList.add('hidden');
            other.previousElementSibling?.setAttribute('aria-expanded', 'false');
        });
        menu.classList.toggle('hidden', !shouldOpen);
        menu.previousElementSibling?.setAttribute('aria-expanded', String(shouldOpen));
    }

    function exportReport(format) {
        document.querySelectorAll('#reportExportMenu, #reportDayExportMenu').forEach(menu => {
            menu.classList.add('hidden');
            menu.previousElementSibling?.setAttribute('aria-expanded', 'false');
        });
        const report = reportRows();
        if (format === 'csv') exportCsv(report);
        else if (format === 'pdf') printReport(report);
        else downloadBlob(makeXlsx(report.sheets), `clothes-mania-report-${fileDateRange(report)}.xlsx`);
        if (format !== 'pdf') showToast(`${report.label} report exported.`);
    }

    function parseCsv(text, delimiter = ',') {
        const rows = [];
        let row = [];
        let cell = '';
        let quoted = false;
        const source = text.replace(/^\uFEFF/, '');
        for (let index = 0; index < source.length; index++) {
            const char = source[index];
            if (quoted && char === '"' && source[index + 1] === '"') { cell += '"'; index++; }
            else if (char === '"') quoted = !quoted;
            else if (!quoted && char === delimiter) { row.push(cell); cell = ''; }
            else if (!quoted && (char === '\n' || char === '\r')) {
                if (char === '\r' && source[index + 1] === '\n') index++;
                row.push(cell);
                if (row.some(value => String(value).trim())) rows.push(row);
                row = [];
                cell = '';
            } else cell += char;
        }
        row.push(cell);
        if (row.some(value => String(value).trim())) rows.push(row);
        return rows;
    }

    function findEndOfCentralDirectory(bytes) {
        const minimum = Math.max(0, bytes.length - 65557);
        for (let offset = bytes.length - 22; offset >= minimum; offset--) if (read32(bytes, offset) === 0x06054b50) return offset;
        throw new Error('This Excel workbook is invalid or uses an unsupported ZIP format.');
    }

    function read16(bytes, offset) { return new DataView(bytes.buffer, bytes.byteOffset + offset, 2).getUint16(0, true); }
    function read32(bytes, offset) { return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, true); }

    function inflateRaw(input, expectedSize) {
        let bitOffset = 0;
        let outputOffset = 0;
        const output = new Uint8Array(expectedSize);
        const readBits = count => {
            if (bitOffset + count > input.length * 8) throw new Error('The workbook compression stream ended unexpectedly.');
            let value = 0;
            for (let bit = 0; bit < count; bit++, bitOffset++) value |= ((input[bitOffset >> 3] >> (bitOffset & 7)) & 1) << bit;
            return value;
        };
        const buildTree = lengths => {
            const maxLength = Math.max(...lengths);
            if (!maxLength) throw new Error('The workbook contains an invalid compression table.');
            const counts = new Uint16Array(maxLength + 1);
            for (const length of lengths) if (length) counts[length]++;
            const nextCode = new Uint16Array(maxLength + 1);
            let code = 0;
            for (let length = 1; length <= maxLength; length++) {
                code = (code + counts[length - 1]) << 1;
                nextCode[length] = code;
            }
            const byLength = Array.from({ length: maxLength + 1 }, () => new Map());
            for (let symbol = 0; symbol < lengths.length; symbol++) {
                const length = lengths[symbol];
                if (length) byLength[length].set(nextCode[length]++, symbol);
            }
            return { maxLength, byLength };
        };
        const readSymbol = tree => {
            let code = 0;
            for (let length = 1; length <= tree.maxLength; length++) {
                code = (code << 1) | readBits(1);
                const symbol = tree.byLength[length].get(code);
                if (symbol !== undefined) return symbol;
            }
            throw new Error('The workbook contains an invalid compressed symbol.');
        };
        const lengthBase = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
        const lengthExtra = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
        const distanceBase = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
        const distanceExtra = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
        let finalBlock = false;
        while (!finalBlock) {
            finalBlock = readBits(1) === 1;
            const blockType = readBits(2);
            if (blockType === 0) {
                bitOffset = (bitOffset + 7) & ~7;
                const count = readBits(16);
                const inverseCount = readBits(16);
                if ((count ^ 0xffff) !== inverseCount || outputOffset + count > output.length) throw new Error('The workbook contains an invalid stored block.');
                for (let index = 0; index < count; index++) output[outputOffset++] = readBits(8);
                continue;
            }
            if (blockType === 3) throw new Error('The workbook uses an unsupported compression block.');
            let literalTree;
            let distanceTree;
            if (blockType === 1) {
                const literalLengths = Array.from({ length: 288 }, (_, index) => index <= 143 ? 8 : index <= 255 ? 9 : index <= 279 ? 7 : 8);
                literalTree = buildTree(literalLengths);
                distanceTree = buildTree(Array(32).fill(5));
            } else {
                const literalCount = readBits(5) + 257;
                const distanceCount = readBits(5) + 1;
                const codeLengthCount = readBits(4) + 4;
                const codeOrder = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
                const codeLengths = Array(19).fill(0);
                for (let index = 0; index < codeLengthCount; index++) codeLengths[codeOrder[index]] = readBits(3);
                const codeTree = buildTree(codeLengths);
                const combined = [];
                while (combined.length < literalCount + distanceCount) {
                    const symbol = readSymbol(codeTree);
                    if (symbol <= 15) combined.push(symbol);
                    else if (symbol === 16) {
                        if (!combined.length) throw new Error('The workbook has an invalid repeated compression code.');
                        const repeat = readBits(2) + 3;
                        for (let index = 0; index < repeat; index++) combined.push(combined[combined.length - 1]);
                    } else {
                        const repeat = symbol === 17 ? readBits(3) + 3 : readBits(7) + 11;
                        for (let index = 0; index < repeat; index++) combined.push(0);
                    }
                    if (combined.length > literalCount + distanceCount) throw new Error('The workbook contains an invalid compression table length.');
                }
                literalTree = buildTree(combined.slice(0, literalCount));
                distanceTree = buildTree(combined.slice(literalCount));
            }
            while (true) {
                const symbol = readSymbol(literalTree);
                if (symbol < 256) {
                    if (outputOffset >= output.length) throw new Error('The workbook expands beyond its declared size.');
                    output[outputOffset++] = symbol;
                    continue;
                }
                if (symbol === 256) break;
                const lengthIndex = symbol - 257;
                if (lengthIndex < 0 || lengthIndex >= lengthBase.length) throw new Error('The workbook contains an invalid match length.');
                const matchLength = lengthBase[lengthIndex] + readBits(lengthExtra[lengthIndex]);
                const distanceSymbol = readSymbol(distanceTree);
                if (distanceSymbol >= distanceBase.length) throw new Error('The workbook contains an invalid match distance.');
                const matchDistance = distanceBase[distanceSymbol] + readBits(distanceExtra[distanceSymbol]);
                if (matchDistance > outputOffset || outputOffset + matchLength > output.length) throw new Error('The workbook contains an invalid back-reference.');
                for (let index = 0; index < matchLength; index++) output[outputOffset] = output[outputOffset++ - matchDistance];
            }
        }
        if (outputOffset !== expectedSize) throw new Error('The workbook data failed its decompression size check.');
        return output;
    }

    async function unzipWorkbook(buffer) {
        const bytes = new Uint8Array(buffer);
        const end = findEndOfCentralDirectory(bytes);
        const count = read16(bytes, end + 10);
        let cursor = read32(bytes, end + 16);
        const files = new Map();
        let totalSize = 0;
        for (let index = 0; index < count; index++) {
            if (read32(bytes, cursor) !== 0x02014b50) throw new Error('This Excel workbook has a damaged file directory.');
            const method = read16(bytes, cursor + 10);
            const expectedCrc = read32(bytes, cursor + 16);
            const compressedSize = read32(bytes, cursor + 20);
            const uncompressedSize = read32(bytes, cursor + 24);
            const nameLength = read16(bytes, cursor + 28);
            const extraLength = read16(bytes, cursor + 30);
            const commentLength = read16(bytes, cursor + 32);
            const localOffset = read32(bytes, cursor + 42);
            const filename = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
            cursor += 46 + nameLength + extraLength + commentLength;
            if (!['xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/sharedStrings.xml'].includes(filename) && !/^xl\/worksheets\/sheet\d+\.xml$/i.test(filename)) continue;
            if (uncompressedSize > 20 * 1024 * 1024 || totalSize + uncompressedSize > 45 * 1024 * 1024) throw new Error('The Excel workbook is too large to import safely.');
            if (read32(bytes, localOffset) !== 0x04034b50) throw new Error('This Excel workbook contains a damaged file.');
            const localNameLength = read16(bytes, localOffset + 26);
            const localExtraLength = read16(bytes, localOffset + 28);
            const dataStart = localOffset + 30 + localNameLength + localExtraLength;
            const compressed = bytes.slice(dataStart, dataStart + compressedSize);
            let content;
            if (method === 0) content = compressed;
            else if (method === 8) content = inflateRaw(compressed, uncompressedSize);
            else throw new Error('This Excel workbook uses an unsupported compression method. Save the sheet as CSV and import that file instead.');
            if (content.length !== uncompressedSize) throw new Error('The workbook data failed its size check.');
            if (crc32(content) !== expectedCrc) throw new Error('The workbook data failed its integrity check.');
            totalSize += content.length;
            files.set(filename, decoder.decode(content));
        }
        return files;
    }

    function parseXml(xml, label) {
        const documentNode = new DOMParser().parseFromString(xml, 'application/xml');
        if (documentNode.querySelector('parsererror')) throw new Error(`Could not read the ${label} sheet in this workbook.`);
        return documentNode;
    }

    function cellColumnIndex(cellRef) {
        const letters = String(cellRef || '').match(/[A-Z]+/i)?.[0]?.toUpperCase() || 'A';
        let column = 0;
        for (const letter of letters) column = column * 26 + letter.charCodeAt(0) - 64;
        return column - 1;
    }

    function worksheetMatrix(xml, sharedStrings) {
        const sheet = parseXml(xml, 'worksheet');
        return [...sheet.getElementsByTagName('row')].map(row => {
            const values = [];
            for (const cell of [...row.getElementsByTagName('c')]) {
                const index = cellColumnIndex(cell.getAttribute('r'));
                const type = cell.getAttribute('t');
                const valueNode = cell.getElementsByTagName('v')[0];
                const value = type === 's'
                    ? sharedStrings[Number(valueNode?.textContent || 0)] || ''
                    : type === 'inlineStr'
                        ? [...cell.getElementsByTagName('t')].map(node => node.textContent).join('')
                        : valueNode?.textContent || '';
                values[index] = value;
            }
            return values.map(value => value ?? '');
        });
    }

    function normalizeHeader(value) {
        return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    const headerAliases = {
        date: ['date', 'orderdate', 'transactiondate', 'mineddate', 'solddate'],
        time: ['time', 'ordertime', 'transactiontime'],
        buyer: ['buyer', 'buyername', 'customer', 'customername', 'name'],
        item: ['item', 'itemdetails', 'product', 'productname', 'description'],
        total: ['total', 'ordertotal', 'totalamount', 'ordervalue', 'saleamount', 'sellingprice', 'price'],
        payment: ['dp', 'downpayment', 'downpaymentamount', 'paid', 'amountpaid', 'collected'],
        status: ['status', 'paymentstatus'],
        seller: ['seller', 'liveseller', 'livehost', 'host'],
        mop: ['mop', 'modeofpayment', 'paymentmode', 'paymentmethod'],
        reference: ['reference', 'referenceno', 'referencenumber', 'refno', 'refnumber', 'ref']
    };

    function mapHeaders(headers) {
        const normalized = headers.map(normalizeHeader);
        return Object.fromEntries(Object.entries(headerAliases).map(([field, aliases]) => [field, normalized.findIndex(header => aliases.includes(header))]));
    }

    function findHeaderRow(matrix) {
        for (let index = 0; index < Math.min(matrix.length, 15); index++) {
            const map = mapHeaders(matrix[index] || []);
            if (map.date >= 0 && map.buyer >= 0 && map.item >= 0 && map.total >= 0) return { headerIndex: index, map };
        }
        return null;
    }

    function excelDate(value) {
        if (typeof value === 'number' || /^\d+(\.\d+)?$/.test(String(value || '').trim())) {
            const serial = Number(value);
            if (serial > 20000 && serial < 80000) {
                const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000);
                return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
            }
        }
        const text = String(value || '').trim();
        let match = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
        if (match) return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        match = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
        if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
            const parsed = new Date(text);
        if (Number.isNaN(parsed.getTime())) return '';
        return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
    }

    function parseAmount(value) {
        const text = String(value ?? '').replace(/[₱,$\s]/g, '').trim();
        if (!text) return 0;
        const negative = /^\(.*\)$/.test(text);
        const amount = Number(text.replace(/[()]/g, ''));
        return Number.isFinite(amount) ? (negative ? -amount : amount) : NaN;
    }

    function getRowValue(row, index) { return index >= 0 ? row[index] : ''; }

    function recordKey(record) {
        return [record.date, record.name, record.item, Number(record.total || record.price || 0).toFixed(2)]
            .map(value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase())
            .join('|');
    }

    function prepareImport(matrix, filename, sheetName = '') {
        const header = findHeaderRow(matrix);
        if (!header) throw new Error('Could not find required columns. Include Date, Buyer or Customer, Item or Product, and Total or Price.');
        const existing = new Set((db.mines || []).map(recordKey));
        const importedKeys = new Set();
        importState.records = [];
        importState.skipped = [];
        importState.invalid = [];
        importState.kind = 'orders';
        importState.filename = filename;
        const { map } = header;
        for (const row of matrix.slice(header.headerIndex + 1)) {
            if (!row.some(value => String(value || '').trim())) continue;
            const total = parseAmount(getRowValue(row, map.total));
            const dp = Math.max(0, parseAmount(getRowValue(row, map.payment)) || 0);
            const importedReference = String(getRowValue(row, map.reference) || '').trim();
            const record = {
                date: excelDate(getRowValue(row, map.date)),
                time: String(getRowValue(row, map.time) || '').trim(),
                name: String(getRowValue(row, map.buyer) || '').trim(),
                item: String(getRowValue(row, map.item) || '').trim(),
                total,
                price: total,
                dp,
                seller: String(getRowValue(row, map.seller) || '').trim(),
                mop: String(getRowValue(row, map.mop) || '').trim(),
                ref: importedReference,
                reference: importedReference,
                imported: true
            };
            const parsedDate = record.date ? new Date(`${record.date}T12:00:00`) : null;
            if (!record.date || !/^\d{4}-\d{2}-\d{2}$/.test(record.date) || Number.isNaN(parsedDate?.getTime()) || parsedDate.toISOString().slice(0, 10) !== record.date || !record.name || !record.item || !Number.isFinite(total) || total <= 0) {
                importState.invalid.push(row);
                continue;
            }
            const sourceStatus = String(getRowValue(row, map.status) || '').trim().toUpperCase();
            if (/CANCELLED|CANCELED/.test(sourceStatus)) record.status = 'CANCELLED';
            else if (sourceStatus === 'PAID' || dp >= total) { record.status = 'PAID'; record.dp = total; }
            else if (sourceStatus === 'PARTIAL' || dp > 0) record.status = 'PARTIAL';
            else record.status = 'UNPAID';
            const key = recordKey(record);
            if (existing.has(key) || importedKeys.has(key)) importState.skipped.push(record);
            else importState.records.push(record);
            importedKeys.add(key);
        }
        importState.sheetName = sheetName;
        renderImportPreview();
    }

    function renderImportPreview() {
        const modal = document.getElementById('reportImportModal');
        const summary = document.getElementById('reportImportSummary');
        const warnings = document.getElementById('reportImportWarnings');
        const body = document.getElementById('reportImportPreview');
        const confirmButton = document.getElementById('confirmReportImport');
        const includeDuplicates = document.getElementById('includeImportDuplicates');
        if (!modal || !summary || !warnings || !body || !confirmButton || !includeDuplicates) return;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        includeDuplicates.checked = false;
        includeDuplicates.onchange = () => { confirmButton.disabled = !importState.records.length && !(includeDuplicates.checked && importState.skipped.length); };
        const sheet = importState.sheetName ? ` · Sheet: ${importState.sheetName}` : '';
        summary.textContent = `${importState.filename}${sheet} · ${importState.records.length} ready · ${importState.skipped.length} possible duplicates · ${importState.invalid.length} invalid`;
        const notes = [];
        if (importState.skipped.length) notes.push(`${importState.skipped.length} possible duplicate row(s) will be skipped unless you choose to include them.`);
        if (importState.invalid.length) notes.push(`${importState.invalid.length} invalid row(s) will be skipped. Check that date, buyer, item, and total are filled in.`);
        warnings.textContent = notes.join(' ');
        warnings.classList.toggle('hidden', !notes.length);
        const sample = [...importState.records.map(record => ({ ...record, previewStatus: 'Ready' })), ...importState.skipped.map(record => ({ ...record, previewStatus: 'Possible duplicate' }))].slice(0, 8);
        body.innerHTML = sample.length
            ? sample.map(record => `<tr><td class="whitespace-nowrap px-3 py-2">${escapeHtml(record.date)}</td><td class="px-3 py-2">${escapeHtml(record.name)}</td><td class="px-3 py-2">${escapeHtml(record.item)}</td><td class="whitespace-nowrap px-3 py-2 text-right">${amountFormatter.format(Math.max(0, record.total || 0))}</td><td class="px-3 py-2 ${record.previewStatus === 'Ready' ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}">${escapeHtml(record.status)} · ${record.previewStatus}</td></tr>`).join('')
            : '<tr><td colspan="5" class="px-3 py-6 text-center text-gray-500">No valid sales rows found in this file.</td></tr>';
        confirmButton.disabled = !importState.records.length;
        document.getElementById('reportImportTitle')?.focus();
    }

    async function readXlsx(file) {
        const files = await unzipWorkbook(await file.arrayBuffer());
        const workbookXml = files.get('xl/workbook.xml');
        if (!workbookXml) throw new Error('The workbook is missing its sheet list.');
        const workbook = parseXml(workbookXml, 'workbook');
        const relationships = files.get('xl/_rels/workbook.xml.rels');
        if (!relationships) throw new Error('The workbook is missing sheet relationships.');
        const relDoc = parseXml(relationships, 'relationship');
        const targets = new Map([...relDoc.getElementsByTagName('Relationship')].map(relation => [relation.getAttribute('Id'), relation.getAttribute('Target')]));
        const sharedDoc = files.has('xl/sharedStrings.xml') ? parseXml(files.get('xl/sharedStrings.xml'), 'shared strings') : null;
        const sharedStrings = sharedDoc ? [...sharedDoc.getElementsByTagName('si')].map(item => [...item.getElementsByTagName('t')].map(text => text.textContent).join('')) : [];
        const sheets = [...workbook.getElementsByTagName('sheet')];
        for (const sheet of sheets) {
            const relId = sheet.getAttribute('r:id') || sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
            let target = targets.get(relId);
            if (!target) continue;
            target = target.replace(/^\//, '');
            if (!target.startsWith('xl/')) target = `xl/${target}`;
            const matrix = worksheetMatrix(files.get(target) || '', sharedStrings);
            if (findHeaderRow(matrix)) return { matrix, sheetName: sheet.getAttribute('name') || 'Sheet' };
        }
        throw new Error('No worksheet contained the required sales columns. Include Date, Buyer, Item, and Total or Price.');
    }

    async function handleFile(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) {
            showToast('Please choose a spreadsheet smaller than 20 MB.', true);
            event.target.value = '';
            return;
        }
        try {
        const extension = file.name.split('.').pop().toLowerCase();
            let matrix;
            let sheetName = '';
            if (extension === 'xlsx') ({ matrix, sheetName } = await readXlsx(file));
            else if (extension === 'csv' || extension === 'tsv') matrix = parseCsv(await file.text(), extension === 'tsv' ? '\t' : ',');
            else throw new Error('Choose an .xlsx, .csv, or .tsv file.');
            prepareImport(matrix, file.name, sheetName);
        } catch (error) {
            closeImport();
            showToast(error.message || 'Could not read this spreadsheet.', true);
        } finally {
            event.target.value = '';
        }
    }

    function closeImport() {
        const modal = document.getElementById('reportImportModal');
        modal?.classList.add('hidden');
        modal?.classList.remove('flex');
        importState.records = [];
        importState.skipped = [];
        importState.invalid = [];
        document.getElementById('reportImportButton')?.focus();
    }

    function confirmImport() {
        const includeDuplicates = document.getElementById('includeImportDuplicates')?.checked;
        const records = [...importState.records, ...(includeDuplicates ? importState.skipped : [])];
        if (!records.length) return;
        const backupConfirmed = confirm(`A JSON backup will download before importing ${records.length} historical order(s). Inventory will not change. Continue?`);
        if (!backupConfirmed) return;
        exportJSONBackup();
        const timestamp = Date.now();
        db.mines = Array.isArray(db.mines) ? db.mines : [];
        records.forEach((record, index) => {
            const uniqueSuffix = window.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
            db.mines.push({ ...record, id: `import_${timestamp}_${index}_${uniqueSuffix}` });
        });
        saveToLocalStorage();
        closeImport();
        showToast(`${records.length} historical order(s) imported. Stock was not changed.`);
    }

    document.addEventListener('click', event => {
        if (!event.target.closest('#reportExportMenu') && !event.target.closest('#reportDayExportMenu') && !event.target.closest('[aria-controls="reportExportMenu"]') && !event.target.closest('[aria-controls="reportDayExportMenu"]')) {
            document.querySelectorAll('#reportExportMenu, #reportDayExportMenu').forEach(menu => {
                menu.classList.add('hidden');
                menu.previousElementSibling?.setAttribute('aria-expanded', 'false');
            });
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !document.getElementById('reportImportModal')?.classList.contains('hidden')) closeImport();
    });

    document.getElementById('includeImportDuplicates')?.addEventListener('change', () => {
        const confirmButton = document.getElementById('confirmReportImport');
        if (confirmButton) confirmButton.disabled = !importState.records.length && !(document.getElementById('includeImportDuplicates')?.checked && importState.skipped.length);
    });

    window.ReportIO = { toggleMenu, exportReport, handleFile, closeImport, confirmImport };
})();
