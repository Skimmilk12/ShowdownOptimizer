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
// 8. Click "Deploy" and AUTHORIZE when prompted
// 9. Copy the Web App URL (NOT the script editor URL!)
// 10. Paste that URL in ShowdownOptimizer's Setup Auto-Push
//
// The URL will look like: https://script.google.com/macros/s/XXXXX/exec
// Make sure it ends with /exec, NOT /dev

// Your Google Sheet IDs (already configured for your sheets)
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
    // Parse the incoming data (could be JSON body or form data)
    let data;

    if (e.postData && e.postData.contents) {
      // Direct JSON body
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter && e.parameter.data) {
      // Form data with 'data' field
      data = JSON.parse(e.parameter.data);
    } else {
      return createResponse({ success: false, error: 'No data received' });
    }

    const position = data.position;
    const records = data.records;

    if (!position || !records || !SHEET_IDS[position]) {
      return createResponse({
        success: false,
        error: 'Invalid position or no records. Position: ' + position
      });
    }

    // Open the correct sheet
    const spreadsheet = SpreadsheetApp.openById(SHEET_IDS[position]);
    const sheet = spreadsheet.getSheets()[0]; // First sheet

    // Append each record as a new row
    // Format: Name, Position, Team, Week, Opponent, FPTS
    let addedCount = 0;
    records.forEach(function(record) {
      sheet.appendRow([
        record.name,
        record.position,
        record.team || '',
        record.week,
        record.opponent || '',
        record.fpts
      ]);
      addedCount++;
    });

    return createResponse({
      success: true,
      added: addedCount,
      position: position,
      message: 'Added ' + addedCount + ' records to ' + position + ' sheet'
    });

  } catch (error) {
    return createResponse({
      success: false,
      error: error.toString()
    });
  }
}

// Handle GET requests (for testing)
function doGet(e) {
  return createResponse({
    status: 'OK',
    message: 'ShowdownOptimizer API is running. Use POST to add data.',
    sheets: Object.keys(SHEET_IDS)
  });
}

// Helper to create JSON response with CORS headers
function createResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
