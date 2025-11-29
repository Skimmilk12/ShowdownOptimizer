// ===========================================
// GOOGLE APPS SCRIPT - Deploy this in Google
// ===========================================
//
// SETUP INSTRUCTIONS:
// 1. Go to https://script.google.com/
// 2. Click "New Project"
// 3. Delete the default code and paste ALL of this code
// 4. Click "Deploy" > "New deployment"
// 5. Select "Web app" as the type
// 6. Set "Execute as" to "Me"
// 7. Set "Who has access" to "Anyone"
// 8. Click "Deploy" and copy the Web App URL
// 9. Paste that URL in your ShowdownOptimizer settings
//
// The URL will look like: https://script.google.com/macros/s/XXXXX/exec

// Your Google Sheet IDs (already configured)
const SHEET_IDS = {
  QB: '1nmPFQ1P1y8N0WPxHOq_FUEuBhSAW6ddLecsuRjyOqHo',
  RB: '1C8UDTi_jXMRE4MHy5Zt4nNkCxKR22QVoXGCWiTAAuaM',
  WR: '1MXTV7mLSLywoslITmHrbjcIKBK2c99RVdteDHxA9dv8',
  TE: '1hRlW5XhqKeSzWE1-E0RHKwUdt99fnUM2zzwk3QDborQ',
  DST: '1RNKJDGegnWt7G7Pmxo6kwHZGTIvvDIyOaTp9racjol8'
};

// Handle POST requests from ShowdownOptimizer
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const position = data.position;
    const records = data.records;

    if (!position || !records || !SHEET_IDS[position]) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Invalid position or no records'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Open the correct sheet
    const spreadsheet = SpreadsheetApp.openById(SHEET_IDS[position]);
    const sheet = spreadsheet.getSheets()[0]; // First sheet

    // Append each record as a new row
    let addedCount = 0;
    records.forEach(record => {
      sheet.appendRow([
        record.name,
        record.position,
        record.team,
        record.week,
        record.opponent,
        record.fpts
      ]);
      addedCount++;
    });

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      added: addedCount,
      position: position
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle GET requests (for testing)
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'OK',
    message: 'ShowdownOptimizer API is running. Use POST to add data.'
  })).setMimeType(ContentService.MimeType.JSON);
}
