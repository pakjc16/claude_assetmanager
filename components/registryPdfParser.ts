/**
 * registryPdfParser.ts
 * 등기부등본 PDF 파싱 유틸리티 (v2 - 컬럼 위치 기반 테이블 파싱)
 * - pdfjs-dist로 텍스트 아이템(X,Y 좌표 포함) 추출
 * - 테이블 헤더 행에서 컬럼 경계 감지
 * - 각 데이터 행의 텍스트를 컬럼별로 분리하여 정확한 필드 추출
 */

import * as pdfjsLib from 'pdfjs-dist';

// pdfjs worker 설정
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

// ── 내보내기 타입 ──────────────────────────────────────────

export interface ParsedGabEntry {
  rankNo: string;
  purpose: string;           // 등기목적
  receiptDate: string;       // 접수일자 (YYYY-MM-DD)
  receiptNo: string;         // 접수번호 (제XXXXX호)
  mainText: string;          // 주요등기사항 원문
  ownerText: string;         // 대상소유자
  isTransferred: boolean;    // 이전된 항목 (하위 순위번호 존재)
}

export interface ParsedEulEntry {
  rankNo: string;
  purpose: string;           // 등기목적
  receiptDate: string;       // 접수일자
  receiptNo: string;         // 접수번호
  mainText: string;          // 주요등기사항 원문
  claimAmount: number;       // 채권최고액 (원)
  rightHolderText: string;   // 근저당권자/채권자/전세권자 이름
  ownerText: string;         // 대상소유자
  isTransferred: boolean;    // 이전된 항목
}

export interface ParsedOwner {
  name: string;
  regNo: string;             // 등록번호
  share: string;             // 최종지분
  address: string;           // 주소
  rankNo: string;            // 순위번호
}

export interface ParsedTradeItem {
  serialNo: number;
  type: '토지' | '건물';
  address: string;
  rankNo: string;
  causeDate: string;
  cause: string;
}

export interface ParsedTradeEntry {
  listNo: string;
  tradeAmount: number;
  items: ParsedTradeItem[];
}

export interface ParsedRegistry {
  owners: ParsedOwner[];
  gabEntries: ParsedGabEntry[];
  eulEntries: ParsedEulEntry[];
}

// ── 내부 타입 ──────────────────────────────────────────────

interface PdfTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageIdx: number;
}

export interface PdfTextRow {
  y: number;
  pageIdx: number;
  items: PdfTextItem[];
  text: string;  // 아이템 연결 텍스트 (갭 기반 공백 포함)
}

interface TableColumn {
  name: string;
  xCenter: number;
  xStart: number;
  xEnd: number;
}

// ── PDF 텍스트 추출 ──────────────────────────────────────

/**
 * PDF에서 위치 정보 포함 텍스트 추출
 */
export async function extractPdfData(file: File): Promise<{ rows: PdfTextRow[]; plainText: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const allItems: PdfTextItem[] = [];
  const pageHeights: number[] = [];

  for (let p = 0; p < pdf.numPages; p++) {
    const page = await pdf.getPage(p + 1);
    const viewport = page.getViewport({ scale: 1.0 });
    pageHeights.push(viewport.height);
    const content = await page.getTextContent();

    // 멀티페이지 Y 오프셋
    const yOffset = pageHeights.slice(0, p).reduce((s, h) => s + h + 50, 0);

    for (const item of content.items) {
      if (!('str' in item)) continue;
      const ti = item as any;
      const str = ti.str as string;
      if (!str || !str.trim()) continue;

      const x = ti.transform[4];
      // bottom-up → top-down Y 변환
      const y = yOffset + (viewport.height - ti.transform[5]);

      allItems.push({
        str,
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        width: ti.width || 0,
        height: Math.abs(ti.transform[3]) || ti.height || 10,
        pageIdx: p,
      });
    }
  }

  const rows = groupIntoRows(allItems);
  const cleanedRows = rows.filter(r => !isNoiseLine(r.text));
  const plainText = cleanedRows.map(r => r.text).join('\n');

  return { rows: cleanedRows, plainText };
}

/**
 * 텍스트 아이템을 Y좌표 기반으로 행 그룹화
 */
function groupIntoRows(items: PdfTextItem[]): PdfTextRow[] {
  if (items.length === 0) return [];

  const sorted = [...items].sort((a, b) => {
    if (Math.abs(a.y - b.y) > 4) return a.y - b.y;
    return a.x - b.x;
  });

  const rows: PdfTextRow[] = [];
  let rowItems: PdfTextItem[] = [sorted[0]];
  let rowY = sorted[0].y;

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    if (Math.abs(item.y - rowY) <= 4) {
      rowItems.push(item);
    } else {
      finishRow(rowItems, rowY, rows);
      rowItems = [item];
      rowY = item.y;
    }
  }
  finishRow(rowItems, rowY, rows);

  return rows;
}

function finishRow(items: PdfTextItem[], y: number, rows: PdfTextRow[]) {
  if (items.length === 0) return;
  items.sort((a, b) => a.x - b.x);
  rows.push({
    y,
    pageIdx: items[0].pageIdx,
    items: [...items],
    text: buildRowText(items),
  });
}

/**
 * 행 내 텍스트 아이템을 갭 기반 공백 포함하여 연결
 */
function buildRowText(items: PdfTextItem[]): string {
  if (items.length === 0) return '';
  let text = items[0].str;
  for (let i = 1; i < items.length; i++) {
    const gap = items[i].x - (items[i - 1].x + items[i - 1].width);
    if (gap > 5) text += ' ';
    text += items[i].str;
  }
  return text;
}

/**
 * 페이지 노이즈 행 판별
 */
function isNoiseLine(text: string): boolean {
  const t = text.trim();
  if (/^-+\s*\d+\s+(of|\/)\s+\d+\s*-+$/i.test(t)) return true;
  if (/^\d+\s*\/\s*\d+$/.test(t)) return true;
  if (/^열\s*람\s*용$/.test(t)) return true;
  if (/^열람일시\s*[:：]/.test(t)) return true;
  if (/^관할\s*등기소/.test(t)) return true;
  if (/^고유번호\s/.test(t)) return true;
  return false;
}

// ── 주소 추출 ──────────────────────────────────────────────

/**
 * PDF 텍스트에서 [토지] 또는 [건물] 주소 추출
 */
export function extractPdfAddress(text: string): { type: '토지' | '건물'; address: string } | null {
  const m = text.match(/\[\s*(토지|건물)\s*\]\s*(.+)/);
  if (m) {
    return { type: m[1] as '토지' | '건물', address: m[2].trim() };
  }
  const m2 = text.match(/표\s*시.*?\n+\s*(.+?(?:도|시|군|구|동|리|로|길)\s+[\d\-]+)/);
  if (m2) {
    return { type: text.includes('건물') && !text.includes('토지') ? '건물' : '토지', address: m2[1].trim() };
  }
  return null;
}

// ── 요약 섹션 파싱 (컬럼 위치 기반) ──────────────────────────

/**
 * "주요 등기사항 요약" 섹션에서 갑구/을구/소유자 파싱
 */
export function parseRegistrySummary(rows: PdfTextRow[]): ParsedRegistry {
  const result: ParsedRegistry = { owners: [], gabEntries: [], eulEntries: [] };

  // 1. 요약 섹션 시작 행 찾기
  const summaryIdx = rows.findIndex(r =>
    /주\s*요\s*등\s*기\s*사\s*항\s*요\s*약/.test(r.text.replace(/\s/g, ''))
  );
  if (summaryIdx < 0) return result;

  // 2. 요약 섹션 끝 행 찾기 (참고사항 또는 매매목록)
  let endIdx = rows.length;
  for (let i = summaryIdx + 1; i < rows.length; i++) {
    const norm = rows[i].text.replace(/\s/g, '');
    if (/참고사항/.test(norm) || /매매목록/.test(norm)) {
      endIdx = i;
      break;
    }
  }

  const sectionRows = rows.slice(summaryIdx + 1, endIdx);

  // 3. 3개 서브섹션 경계 찾기
  let ownerStart = -1, gabStart = -1, eulStart = -1;

  for (let i = 0; i < sectionRows.length; i++) {
    const norm = sectionRows[i].text.replace(/\s/g, '');
    if (ownerStart < 0 && /소유지분현황/.test(norm)) {
      ownerStart = i;
    }
    if (gabStart < 0 && /소유지분을제외한/.test(norm)) {
      gabStart = i;
    }
    if (eulStart < 0 && (/\(근\)저당권/.test(norm) || /근저당권및전세권/.test(norm))) {
      eulStart = i;
    }
  }

  // 4. 소유자 섹션 파싱
  if (ownerStart >= 0) {
    const ownerEnd = gabStart >= 0 ? gabStart : (eulStart >= 0 ? eulStart : sectionRows.length);
    result.owners = parseOwnerSection(sectionRows.slice(ownerStart, ownerEnd));
  }

  // 5. 갑구 섹션 파싱
  if (gabStart >= 0) {
    const gabEnd = eulStart >= 0 ? eulStart : sectionRows.length;
    result.gabEntries = parseGabSection(sectionRows.slice(gabStart, gabEnd));
  }

  // 6. 을구 섹션 파싱
  if (eulStart >= 0) {
    result.eulEntries = parseEulSection(sectionRows.slice(eulStart));
  }

  return result;
}

// ── 컬럼 감지 ──────────────────────────────────────────────

/**
 * 행들에서 테이블 헤더 찾아서 컬럼 경계 반환
 */
function findTableHeader(
  rows: PdfTextRow[],
  headerNames: string[]
): { rowIdx: number; columns: TableColumn[] } | null {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const rowTextNorm = rows[i].text.replace(/\s/g, '');

    // 헤더 이름 중 최소 3개 일치해야 함
    let matchCount = 0;
    for (const h of headerNames) {
      if (rowTextNorm.includes(h.replace(/\s/g, ''))) matchCount++;
    }

    const threshold = Math.min(3, Math.ceil(headerNames.length * 0.6));
    if (matchCount >= threshold) {
      const columns = buildColumns(rows[i], headerNames);
      if (columns.length >= threshold) {
        return { rowIdx: i, columns };
      }
    }
  }
  return null;
}

/**
 * 헤더 행에서 컬럼 위치 감지
 */
function buildColumns(row: PdfTextRow, headerNames: string[]): TableColumn[] {
  const columns: TableColumn[] = [];
  const usedItems = new Set<number>();

  for (const header of headerNames) {
    const headerNorm = header.replace(/\s/g, '');
    let found = false;

    // 단일 아이템에서 찾기
    for (let j = 0; j < row.items.length && !found; j++) {
      if (usedItems.has(j)) continue;
      if (row.items[j].str.replace(/\s/g, '').includes(headerNorm)) {
        const item = row.items[j];
        columns.push({
          name: header,
          xCenter: item.x + item.width / 2,
          xStart: item.x,
          xEnd: item.x + item.width,
        });
        usedItems.add(j);
        found = true;
      }
    }

    // 인접 아이템 결합해서 찾기
    if (!found) {
      for (let j = 0; j < row.items.length && !found; j++) {
        if (usedItems.has(j)) continue;
        let combined = '';
        const itemIndices: number[] = [];
        const startX = row.items[j].x;
        let endX = row.items[j].x + row.items[j].width;

        for (let k = j; k < row.items.length && !found; k++) {
          if (usedItems.has(k)) break;
          combined += row.items[k].str.replace(/\s/g, '');
          endX = row.items[k].x + row.items[k].width;
          itemIndices.push(k);

          if (combined.includes(headerNorm)) {
            columns.push({
              name: header,
              xCenter: (startX + endX) / 2,
              xStart: startX,
              xEnd: endX,
            });
            itemIndices.forEach(idx => usedItems.add(idx));
            found = true;
          }
        }
      }
    }
  }

  // X 위치로 정렬
  columns.sort((a, b) => a.xCenter - b.xCenter);

  // 컬럼 경계를 인접 컬럼 중간점으로 조정
  for (let i = 0; i < columns.length; i++) {
    if (i === 0) {
      columns[i].xStart = 0;
    } else {
      const mid = (columns[i - 1].xCenter + columns[i].xCenter) / 2;
      columns[i - 1].xEnd = mid;
      columns[i].xStart = mid;
    }
    if (i === columns.length - 1) {
      columns[i].xEnd = 9999;
    }
  }

  return columns;
}

/**
 * 행의 아이템들을 컬럼별로 분류 (갭 기반 공백 보존)
 */
function getColumnTexts(row: PdfTextRow, columns: TableColumn[]): Record<string, string> {
  const result: Record<string, string> = {};
  const columnItems: Record<string, PdfTextItem[]> = {};

  for (const col of columns) {
    result[col.name] = '';
    columnItems[col.name] = [];
  }

  for (const item of row.items) {
    const itemCenter = item.x + item.width / 2;
    for (const col of columns) {
      if (itemCenter >= col.xStart && itemCenter < col.xEnd) {
        columnItems[col.name].push(item);
        break;
      }
    }
  }

  // 각 컬럼의 아이템을 X순으로 정렬 후 갭 기반 공백 포함하여 연결
  for (const col of columns) {
    const items = columnItems[col.name];
    items.sort((a, b) => a.x - b.x);
    if (items.length === 0) continue;

    let text = items[0].str;
    for (let i = 1; i < items.length; i++) {
      const gap = items[i].x - (items[i - 1].x + items[i - 1].width);
      if (gap > 3) text += ' ';
      text += items[i].str;
    }
    result[col.name] = text.trim();
  }

  // 후처리: 컬럼 간 텍스트 혼입 보정
  postProcessColumns(result);

  return result;
}

/**
 * 컬럼 경계 오차로 인한 텍스트 혼입 보정
 * - 순위번호에 한글 텍스트 혼입 → 등기목적으로 이동
 * - 접수정보에 채권최고액/권리자 키워드 혼입 → 주요등기사항으로 이동
 * - 등기목적에 날짜 혼입 → 접수정보로 이동
 */
function postProcessColumns(cols: Record<string, string>) {
  // 순위번호에 한글 텍스트가 섞인 경우 → 등기목적으로 이동
  // "3-1" 같은 하위 순위번호는 유지 (공백 포함 "3 - 1"도 처리)
  if ('순위번호' in cols && '등기목적' in cols) {
    const rank = cols['순위번호'];
    const m = rank.match(/^(\d+(?:\s*-\s*\d+)?)\s*(.*)$/);
    if (m && m[2]) {
      cols['순위번호'] = m[1].replace(/\s/g, ''); // "3 - 1" → "3-1"
      cols['등기목적'] = (m[2] + (cols['등기목적'] ? ' ' + cols['등기목적'] : '')).trim();
    } else if (m && m[1]) {
      cols['순위번호'] = m[1].replace(/\s/g, '');
    }
  }

  // 접수정보에 채권최고액/근저당권자 등이 섞인 경우 → 주요등기사항으로 이동
  if ('접수정보' in cols && '주요등기사항' in cols) {
    const receipt = cols['접수정보'];
    const keywords = ['채권최고액', '근저당권자', '전세권자', '채권자', '권리자', '임차권자', '금\\d'];
    for (const kw of keywords) {
      const re = new RegExp(kw);
      const m = receipt.match(re);
      if (m && m.index !== undefined) {
        const moved = receipt.substring(m.index);
        cols['접수정보'] = receipt.substring(0, m.index).trim();
        cols['주요등기사항'] = (moved + ' ' + cols['주요등기사항']).trim();
        break;
      }
    }
  }

  // 등기목적에 접수 날짜가 섞인 경우 → 접수정보로 이동
  if ('등기목적' in cols && '접수정보' in cols) {
    const purpose = cols['등기목적'];
    const dateMatch = purpose.match(/(\d{4}년\d{1,2}월\d{1,2}일.*)$/);
    if (dateMatch && dateMatch.index !== undefined) {
      cols['등기목적'] = purpose.substring(0, dateMatch.index).trim();
      cols['접수정보'] = (dateMatch[1] + ' ' + cols['접수정보']).trim();
    }
  }
}

// ── 소유자 섹션 파싱 ──────────────────────────────────────

const OWNER_HEADERS = ['등기명의인', '등록번호', '최종지분', '주소', '순위번호'];

function parseOwnerSection(rows: PdfTextRow[]): ParsedOwner[] {
  const header = findTableHeader(rows, OWNER_HEADERS);
  if (!header) return [];

  const dataRows = rows.slice(header.rowIdx + 1);
  if (dataRows.some(r => /해당\s*사항\s*없음/.test(r.text.replace(/\s/g, '')))) return [];

  const owners: ParsedOwner[] = [];
  let currentOwner: Partial<ParsedOwner> | null = null;

  for (const row of dataRows) {
    const cols = getColumnTexts(row, header.columns);
    const nameCol = cols['등기명의인'] || '';
    const regNoCol = cols['등록번호'] || '';
    const shareCol = cols['최종지분'] || '';
    const addrCol = cols['주소'] || '';
    const rankCol = cols['순위번호'] || '';

    // 새 소유자 행 (이름이 있으면)
    if (nameCol) {
      if (currentOwner && currentOwner.name) {
        owners.push(currentOwner as ParsedOwner);
      }
      currentOwner = {
        name: nameCol,
        regNo: regNoCol,
        share: shareCol || '단독소유',
        address: addrCol,
        rankNo: rankCol,
      };
    } else if (currentOwner) {
      // 이전 행의 연속 (주소 등이 줄바꿈)
      if (addrCol) currentOwner.address = ((currentOwner.address || '') + ' ' + addrCol).trim();
      if (regNoCol && !currentOwner.regNo) currentOwner.regNo = regNoCol;
      if (rankCol && !currentOwner.rankNo) currentOwner.rankNo = rankCol;
    }
  }

  if (currentOwner && currentOwner.name) {
    owners.push(currentOwner as ParsedOwner);
  }

  return owners;
}

// ── 갑구/을구 공통 ──────────────────────────────────────

const GAB_EUL_HEADERS = ['순위번호', '등기목적', '접수정보', '주요등기사항', '대상소유자'];

interface RawEntry {
  rankNo: string;
  columnLines: Record<string, string[]>;
}

/**
 * 데이터 행들을 순위번호 기준으로 엔트리 그룹화
 * 순위번호가 있는 행에서 새 엔트리 시작, 없으면 이전 엔트리에 이어붙이기
 */
function groupEntryRows(
  dataRows: PdfTextRow[],
  columns: TableColumn[],
  rankColumnName: string
): RawEntry[] {
  const entries: RawEntry[] = [];
  let current: RawEntry | null = null;

  for (const row of dataRows) {
    const cols = getColumnTexts(row, columns);
    const rankText = (cols[rankColumnName] || '').trim();

    // 새 엔트리 시작 (순위번호가 숫자로 시작)
    const isNewEntry = /^\d/.test(rankText);

    if (isNewEntry) {
      if (current) entries.push(current);
      current = { rankNo: rankText, columnLines: {} };
      for (const col of columns) {
        current.columnLines[col.name] = cols[col.name] ? [cols[col.name]] : [];
      }
    } else if (current) {
      // 이전 엔트리에 줄 추가 (텍스트 줄바꿈)
      for (const col of columns) {
        if (cols[col.name]) {
          current.columnLines[col.name].push(cols[col.name]);
        }
      }
    }
  }

  if (current) entries.push(current);
  return entries;
}

/**
 * 이전된 항목 감지: 하위 순위번호(X-1, X-2)가 존재하면 부모(X)는 이전됨
 */
function findTransferredRanks(entries: RawEntry[]): Set<string> {
  const parentRanks = new Set<string>();
  for (const entry of entries) {
    const dash = entry.rankNo.match(/^(\d+)-\d+$/);
    if (dash) parentRanks.add(dash[1]);
  }
  return parentRanks;
}

// ── 갑구 섹션 파싱 ──────────────────────────────────────

function parseGabSection(rows: PdfTextRow[]): ParsedGabEntry[] {
  const header = findTableHeader(rows, GAB_EUL_HEADERS);
  if (!header) return [];

  const dataRows = rows.slice(header.rowIdx + 1);
  if (dataRows.some(r => /해당\s*사항\s*없음/.test(r.text.replace(/\s/g, '')))) return [];

  const rawEntries = groupEntryRows(dataRows, header.columns, '순위번호');
  const parentRanks = findTransferredRanks(rawEntries);

  return rawEntries.map(entry => {
    const { receiptDate, receiptNo } = parseReceiptInfo(entry.columnLines['접수정보'] || []);
    const mainText = joinLines(entry.columnLines['주요등기사항'] || []);
    const ownerText = joinLines(entry.columnLines['대상소유자'] || []);
    const baseRank = entry.rankNo.match(/^(\d+)$/)?.[1] || '';

    return {
      rankNo: entry.rankNo,
      purpose: joinLines(entry.columnLines['등기목적'] || []),
      receiptDate,
      receiptNo,
      mainText,
      ownerText,
      isTransferred: baseRank ? parentRanks.has(baseRank) : false,
    };
  });
}

// ── 을구 섹션 파싱 ──────────────────────────────────────

function parseEulSection(rows: PdfTextRow[]): ParsedEulEntry[] {
  const header = findTableHeader(rows, GAB_EUL_HEADERS);
  if (!header) return [];

  const dataRows = rows.slice(header.rowIdx + 1);
  if (dataRows.some(r => /해당\s*사항\s*없음/.test(r.text.replace(/\s/g, '')))) return [];

  const rawEntries = groupEntryRows(dataRows, header.columns, '순위번호');
  const parentRanks = findTransferredRanks(rawEntries);

  return rawEntries.map(entry => {
    const { receiptDate, receiptNo } = parseReceiptInfo(entry.columnLines['접수정보'] || []);
    const mainText = joinLines(entry.columnLines['주요등기사항'] || []);
    const ownerText = joinLines(entry.columnLines['대상소유자'] || []);
    const baseRank = entry.rankNo.match(/^(\d+)$/)?.[1] || '';

    return {
      rankNo: entry.rankNo,
      purpose: joinLines(entry.columnLines['등기목적'] || []),
      receiptDate,
      receiptNo,
      mainText,
      claimAmount: extractClaimAmount(mainText),
      rightHolderText: extractRightHolder(mainText),
      ownerText,
      isTransferred: baseRank ? parentRanks.has(baseRank) : false,
    };
  });
}

// ── 필드 추출 유틸 ──────────────────────────────────────

/**
 * 접수정보 컬럼에서 접수일자와 접수번호 추출
 */
function parseReceiptInfo(lines: string[]): { receiptDate: string; receiptNo: string } {
  let receiptDate = '';
  let receiptNo = '';

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;

    if (!receiptDate) {
      const dateMatch = t.match(/(\d{4})년?\s*(\d{1,2})월?\s*(\d{1,2})일?/);
      if (dateMatch) {
        receiptDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
      }
    }

    if (!receiptNo) {
      const noMatch = t.match(/제\s*([\d]+)\s*호/);
      if (noMatch) {
        receiptNo = `제${noMatch[1]}호`;
      }
    }
  }

  return { receiptDate, receiptNo };
}

/**
 * 주요등기사항에서 채권최고액 추출
 */
function extractClaimAmount(text: string): number {
  const match = text.match(/금\s*([\d,]+)\s*원/);
  if (match) {
    return parseInt(match[1].replace(/,/g, ''), 10) || 0;
  }
  return 0;
}

/**
 * 주요등기사항에서 권리자 이름 추출
 */
function extractRightHolder(text: string): string {
  const holderKeywords = ['근저당권자', '전세권자', '채권자', '임차권자', '지상권자', '권리자'];
  const stopKeywords = ['채권최고액', '채무자', '공동담보', '청구금액', '전세금', '변경'];

  for (const kw of holderKeywords) {
    const idx = text.indexOf(kw);
    if (idx >= 0) {
      let after = text.substring(idx + kw.length).trim();

      // 다음 키워드 또는 다른 권리자 키워드 앞에서 자르기
      let cutIdx = after.length;
      for (const sk of [...stopKeywords, ...holderKeywords]) {
        if (sk === kw) continue;
        const skIdx = after.indexOf(sk);
        if (skIdx > 0 && skIdx < cutIdx) {
          cutIdx = skIdx;
        }
      }
      after = after.substring(0, cutIdx).trim();

      if (after) return after;
    }
  }

  // Fallback: 금액("금X원") 뒤의 텍스트를 권리자로 추출
  // 키워드 없이 "금2,880,000,000원 송파신용협동조합" 형태인 경우 대응
  const amountMatch = text.match(/금\s*[\d,]+\s*원\s*/);
  if (amountMatch && amountMatch.index !== undefined) {
    const after = text.substring(amountMatch.index + amountMatch[0].length).trim();
    if (after) return after;
  }

  return '';
}

/**
 * 컬럼 라인 배열을 공백으로 연결
 */
function joinLines(lines: string[]): string {
  return lines.map(l => l.trim()).filter(Boolean).join(' ');
}

// ── 매매목록 파싱 ──────────────────────────────────────

/**
 * "매매목록" 섹션에서 거래정보 파싱
 */
export function parseTradeList(text: string): ParsedTradeEntry | null {
  const tradeStart = text.match(/매\s*매\s*목\s*록/);
  if (!tradeStart || tradeStart.index === undefined) return null;

  const tradeText = text.substring(tradeStart.index + tradeStart[0].length);
  const lines = tradeText.split('\n').map(l => l.trim()).filter(Boolean);

  let listNo = '';
  let tradeAmount = 0;
  const items: ParsedTradeItem[] = [];

  for (const line of lines) {
    // 참고사항 도달 시 중단
    if (/참\s*고\s*사\s*항/.test(line)) break;

    // 목록번호
    const listNoMatch = line.match(/목록\s*번호\s*[:：]?\s*(\d+)/);
    if (listNoMatch) { listNo = listNoMatch[1]; continue; }

    // 거래가액
    const amountMatch = line.match(/거래\s*가액\s*[:：]?\s*금?\s*([\d,]+)\s*원?/);
    if (amountMatch) {
      tradeAmount = parseInt(amountMatch[1].replace(/,/g, ''), 10) || 0;
      continue;
    }
    if (!tradeAmount) {
      const amtOnly = line.match(/^금?\s*([\d,]{5,})\s*원$/);
      if (amtOnly) {
        tradeAmount = parseInt(amtOnly[1].replace(/,/g, ''), 10) || 0;
        continue;
      }
    }

    // 일련번호 행
    const itemMatch = line.match(/^(\d+)\s+(토지|건물)\s+(.+?)\s+(\d[\d\-]*)\s+(\d{4}년?\s*\d{1,2}월?\s*\d{1,2}일?)\s+(.+)/);
    if (itemMatch) {
      items.push({
        serialNo: parseInt(itemMatch[1], 10),
        type: itemMatch[2] as '토지' | '건물',
        address: itemMatch[3].trim(),
        rankNo: itemMatch[4],
        causeDate: normalizeDate(itemMatch[5]),
        cause: itemMatch[6].trim(),
      });
      continue;
    }

    const simpleItem = line.match(/^(\d+)\s+(토지|건물)\s+(.+)/);
    if (simpleItem) {
      items.push({
        serialNo: parseInt(simpleItem[1], 10),
        type: simpleItem[2] as '토지' | '건물',
        address: simpleItem[3].trim(),
        rankNo: '',
        causeDate: '',
        cause: '',
      });
    }
  }

  if (!listNo && !tradeAmount && items.length === 0) return null;
  return { listNo: listNo || '1', tradeAmount, items };
}

// ── 유틸 ──────────────────────────────────────────────

function normalizeDate(dateStr: string): string {
  if (!dateStr) return '';
  const m = dateStr.match(/(\d{4})년?\s*(\d{1,2})월?\s*(\d{1,2})일?/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  const m2 = dateStr.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (m2) return `${m2[1]}-${m2[2].padStart(2, '0')}-${m2[3].padStart(2, '0')}`;
  return dateStr.trim();
}
