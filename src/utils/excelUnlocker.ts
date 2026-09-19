import JSZip from "jszip";
import * as XLSX from "xlsx";

export interface UnlockResult {
  unlockedBlob: Blob;
  filename: string;
  sheets: {
    name: string;
    rowCount: number;
    columnCount: number;
    previewData: any[][];
  }[];
  protectionsRemoved: string[];
}

/**
 * Removes password protection and sheet restrictions from XLSX files
 */
export async function unlockExcelFile(file: File): Promise<UnlockResult> {
  const arrayBuffer = await file.arrayBuffer();
  const protectionsRemoved: string[] = [];

  let unlockedBlob: Blob;

  try {
    // Attempt standard OOXML (Zip) manipulation
    const zip = await JSZip.loadAsync(arrayBuffer);

    // 1. Check & modify workbook.xml for workbookProtection
    const workbookXmlPath = "xl/workbook.xml";
    const workbookXmlFile = zip.file(workbookXmlPath);
    if (workbookXmlFile) {
      let content = await workbookXmlFile.async("string");
      if (content.includes("<workbookProtection")) {
        content = content.replace(/<workbookProtection[^>]*\/>/g, "");
        content = content.replace(/<workbookProtection[^>]*>.*?<\/workbookProtection>/gs, "");
        zip.file(workbookXmlPath, content);
        protectionsRemoved.push("Workbook Structure & Windows Protection");
      }
      if (content.includes("<fileSharing")) {
        content = content.replace(/<fileSharing[^>]*\/>/g, "");
        zip.file(workbookXmlPath, content);
        protectionsRemoved.push("File Sharing Restriction");
      }
    }

    // 2. Check each sheet in xl/worksheets/sheet*.xml for sheetProtection
    const worksheetFiles = zip.file(/xl\/worksheets\/sheet\d+\.xml/);
    let removedSheetCount = 0;
    for (const sheetFile of worksheetFiles) {
      let content = await sheetFile.async("string");
      if (content.includes("<sheetProtection")) {
        content = content.replace(/<sheetProtection[^>]*\/>/g, "");
        content = content.replace(/<sheetProtection[^>]*>.*?<\/sheetProtection>/gs, "");
        zip.file(sheetFile.name, content);
        removedSheetCount++;
      }
    }
    if (removedSheetCount > 0) {
      protectionsRemoved.push(`Sheet Protection removed from ${removedSheetCount} worksheet(s)`);
    }

    if (protectionsRemoved.length === 0) {
      protectionsRemoved.push("No explicit sheet locks detected — file regenerated with full edit rights");
    }

    // Generate unlocked XLSX blob
    const modifiedZip = await zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    unlockedBlob = modifiedZip;
  } catch (zipError) {
    console.warn("Could not modify zip directly, falling back to XLSX re-export:", zipError);
    // If standard zip fails (e.g. older format or binary), use SheetJS to read and re-write
    const wb = XLSX.read(arrayBuffer, { type: "array" });
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    unlockedBlob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    protectionsRemoved.push("Re-encoded workbook into unlocked standard XLSX");
  }

  // Parse sheets for live table preview
  const sheets: UnlockResult["sheets"] = [];
  try {
    const freshBuf = await unlockedBlob.arrayBuffer();
    const wb = XLSX.read(freshBuf, { type: "array" });
    wb.SheetNames.forEach((sheetName) => {
      const ws = wb.Sheets[sheetName];
      const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      const rowCount = data.length;
      const columnCount = data.reduce((max, row) => Math.max(max, row.length), 0);
      sheets.push({
        name: sheetName,
        rowCount,
        columnCount,
        previewData: data.slice(0, 10), // first 10 rows for preview
      });
    });
  } catch (parseErr) {
    console.warn("Could not preview sheet rows:", parseErr);
  }

  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const outputFilename = `${baseName}_unlocked.xlsx`;

  return {
    unlockedBlob,
    filename: outputFilename,
    sheets,
    protectionsRemoved,
  };
}

/**
 * Creates a sample locked Excel file for demonstration testing
 */
export function createSampleLockedExcel(): File {
  const wb = XLSX.utils.book_new();
  const sampleData = [
    ["Employee ID", "Full Name", "Department", "Salary", "Status"],
    ["EMP-1001", "Anderson, John David", "Engineering", "$115,000", "Active"],
    ["EMP-1002", "Miller, Sarah Jane", "Marketing", "$94,000", "Active"],
    ["EMP-1003", "Chen, Wei Michael", "Product", "$128,000", "Active"],
    ["EMP-1004", "Taylor, Robert James", "Operations", "$86,500", "Active"],
  ];
  const ws = XLSX.utils.aoa_to_sheet(sampleData);
  // Mark sheet as protected in worksheet properties
  ws["!protect"] = {
    password: "samplePassword123",
  } as XLSX.ProtectInfo;
  XLSX.utils.book_append_sheet(wb, ws, "Financial_Records");
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new File([wbout as any], "Quarterly_Financial_Protected.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
